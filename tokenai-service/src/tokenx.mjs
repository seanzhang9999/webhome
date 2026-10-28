import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { ProxyAgent, fetch as proxyFetch } from 'undici';
import { uid, now } from './store.mjs';
import { redact } from './config.mjs';

export const READ_TOOLS = new Set(['scenario_list', 'scenario_status', 'scenario_result']);
export const WRITE_TOOLS = new Set(['scenario_upload_file', 'scenario_cancel', 'finance_expense_reimbursement', 'finance_contract_payment', 'finance_enterprise_reimbursement', 'finance_finance_general_audit', 'scenario_share_link']);
export const resultText = r => (r.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
export function remoteId(result) {
  const objects = [result.structuredContent];
  for (const block of result.content || []) { if (block.type === 'text') { try { objects.push(JSON.parse(block.text)); } catch {} } }
  for (const value of objects) {
    for (const o of [value, value?.data, value?.result]) if (o && typeof o === 'object') {
      for (const key of ['run_id', 'task_id', 'execution_id', 'scenario_run_id', 'request_id', 'file_id']) if (['string','number'].includes(typeof o[key])) return String(o[key]);
    }
  }
  return null;
}

export class TokenX {
  constructor(config) { this.config = config; this.tools = []; this.validators = new Map(); this.status = { connected: false, checkedAt: null, error: config.mcpToken ? null : '尚未配置 TokenX 凭据' }; this.ajv = new Ajv({ strict: false, allErrors: true }); this.proxy = config.mcpProxyUrl ? new ProxyAgent(config.mcpProxyUrl) : null; }
  async connect() {
    if (this.client) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.#connect();
    try { await this.connecting; } finally { this.connecting = null; }
  }
  async #connect() {
    if (!this.config.mcpToken) throw new Error('尚未配置 TokenX 凭据');
    const transport = new StreamableHTTPClientTransport(new URL(this.config.mcpUrl), {
      requestInit: { headers: { Authorization: 'Bearer ' + this.config.mcpToken }, redirect: 'error' },
      ...(this.proxy ? { fetch: (url, options) => proxyFetch(url, { ...options, dispatcher: this.proxy }) } : {}),
    });
    const client = new Client({ name: 'awiki-tokenai', version: '1.0.0' }, { capabilities: {} });
    try {
      await client.connect(transport, { timeout: 15000 });
      let cursor, tools = [];
      do {
        const page = await client.listTools(cursor ? { cursor } : {}, { timeout: 15000 });
        tools.push(...page.tools); cursor = page.nextCursor;
        if (tools.length > 100) throw new Error('Unexpected tool catalogue size');
      } while (cursor);
      const validators = new Map(tools.filter(t => READ_TOOLS.has(t.name) || WRITE_TOOLS.has(t.name)).map(t => [t.name, this.ajv.compile(t.inputSchema)]));
      this.tools = tools; this.validators = validators; this.client = client;
      this.status = { connected: true, checkedAt: now(), error: null, server: client.getServerVersion() };
    } catch (e) {
      await client.close().catch(() => {});
      this.status = { connected: false, checkedAt: now(), error: redact(e.message, this.config) };
      throw new Error(this.status.error);
    }
  }
  allowed(name) { return READ_TOOLS.has(name) || (this.config.writeEnabled && WRITE_TOOLS.has(name) && (name !== 'scenario_share_link' || this.config.shareEnabled) && (name !== 'scenario_upload_file' || !!this.config.uploadContentField)); }
  attachmentArgs(store, matterId, attachmentId) {
    const file = store.get('SELECT * FROM files WHERE id=? AND matter_id=?', attachmentId, matterId);
    if (!file) throw new Error('附件不存在或不属于当前事项');
    const schema = this.tools.find(t => t.name === 'scenario_upload_file')?.inputSchema;
    const field = this.config.uploadContentField, nameField = this.config.uploadNameField;
    if (!field || !schema?.properties?.[field] || schema.properties[field].type !== 'string') throw new Error('上传字段映射尚未依据 TokenX schema 配置');
    if (nameField && !schema.properties[nameField]) throw new Error('文件名字段映射不符合 TokenX schema');
    if (!['base64', 'text'].includes(this.config.uploadEncoding)) throw new Error('Unsupported upload encoding');
    if (this.config.uploadEncoding === 'text' && !file.mime.startsWith('text/')) throw new Error('当前上传配置只支持文本附件');
    const bytes = readFileSync(file.path);
    const args = { ...this.config.uploadDefaults, [field]: bytes.toString(this.config.uploadEncoding === 'text' ? 'utf8' : 'base64') };
    if (nameField) args[nameField] = file.name;
    this.validate('scenario_upload_file', args);
    return args;
  }
  proposeAttachment(store, matterId, user, attachmentId) {
    this.attachmentArgs(store, matterId, attachmentId);
    const id = uid();
    store.run('INSERT INTO operations VALUES(?,?,?,?,?,?,?,?,?)', id, matterId, user.id, 'scenario_upload_file', JSON.stringify({ attachmentId }), 'pending', null, Date.now() + 10 * 60000, now());
    store.event(matterId, null, 'approval_required', { operationId: id, tool: 'scenario_upload_file' });
    return { operationId: id, state: 'pending', notice: '附件尚未发送给 TokenX，请在页面核对并确认。' };
  }
  validate(name, args) {
    if (!this.allowed(name)) throw new Error('该工具尚未获得授权');
    if (name === 'scenario_result' && args.include_share === true) throw new Error('生成分享链接需要单独的分享操作确认，请使用 include_share=false 查询结果。');
    const validate = this.validators.get(name);
    if (!validate || !validate(args)) throw new Error('工具参数不符合服务端 inputSchema: ' + JSON.stringify(validate?.errors || []));
  }
  async call(name, args, signal) {
    await this.connect(); this.validate(name, args);
    try {
      // No automatic replay of tools/call, including uncertain network failures.
      const result = await this.client.callTool({ name, arguments: args }, undefined, { timeout: 60000, signal });
      if (result.isError) throw Object.assign(new Error(resultText(result) || 'TokenX 工具返回错误'), { toolError: true });
      return JSON.parse(redact(result, this.config));
    } catch (e) {
      if (!e.toolError) { await this.client?.close().catch(() => {}); this.client = null; this.status = { connected: false, checkedAt: now(), error: redact(e.message, this.config) }; }
      throw Object.assign(new Error(redact(e.message, this.config)), { toolError: !!e.toolError });
    }
  }
  propose(store, matterId, user, name, args) {
    this.validate(name, args);
    if (READ_TOOLS.has(name)) throw new Error('只读工具无需确认');
    const id = uid();
    store.run('INSERT INTO operations VALUES(?,?,?,?,?,?,?,?,?)', id, matterId, user.id, name, JSON.stringify(args), 'pending', null, Date.now() + 10 * 60000, now());
    store.event(matterId, null, 'approval_required', { operationId: id, tool: name });
    return { operationId: id, state: 'pending', notice: '等待财务人员在事项中确认；尚未提交到 TokenX。' };
  }
  async confirm(store, operationId, user, approve) {
    const op = store.transaction(() => {
      const o = store.get('SELECT o.* FROM operations o JOIN members m ON m.matter_id=o.matter_id JOIN matters x ON x.id=o.matter_id WHERE o.id=? AND o.user_id=? AND m.user_id=? AND x.tenant=?', operationId, user.id, user.id, user.tenant);
      if (!o) throw Object.assign(new Error('操作不存在或无权限'), { statusCode: 404 });
      if (o.state !== 'pending') return o;
      if (o.expires < Date.now()) { store.run("UPDATE operations SET state='expired' WHERE id=?", o.id); return { ...o, state: 'expired' }; }
      store.run('UPDATE operations SET state=? WHERE id=?', approve ? 'executing' : 'rejected', o.id);
      return { ...o, state: approve ? 'execute_now' : 'rejected' };
    });
    if (op.state !== 'execute_now') return { id: op.id, state: op.state };
    let state, result;
    try {
      const savedArgs = JSON.parse(op.args);
      const args = op.tool === 'scenario_upload_file' ? this.attachmentArgs(store, op.matter_id, savedArgs.attachmentId) : savedArgs;
      result = await this.call(op.tool, args); state = 'completed';
      store.run('INSERT INTO runs VALUES(?,?,?,?,?,?,?)', uid(), op.matter_id, op.id, op.tool, remoteId(result), JSON.stringify(result), now());
    } catch (e) { state = e.toolError ? 'failed' : 'unknown'; result = { error: e.message, notice: state === 'unknown' ? '提交结果待核实，请先查询状态，勿重复提交。' : '业务工具返回失败' }; }
    store.run('UPDATE operations SET state=?,result=? WHERE id=?', state, JSON.stringify(result), op.id);
    store.message(op.matter_id, null, 'tokenai', 'TokenAI 报销费控助手', op.tool + '：' + (state === 'completed' ? resultText(result) || JSON.stringify(result.structuredContent || result) : result.notice + '\n' + result.error));
    store.event(op.matter_id, null, 'operation_completed', { operationId: op.id, state });
    return { id: op.id, state, result };
  }
  async close() { await this.client?.close(); this.client = null; await this.proxy?.close(); }
}
