import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, uid, now } from '../src/store.mjs';
import { addUser, issueCode, exchangeCode, authenticate, challenge, hash } from '../src/auth.mjs';
import { configuration, redact } from '../src/config.mjs';
import { TokenX } from '../src/tokenx.mjs';
import { PiAgent } from '../src/agent.mjs';
import { buildApp } from '../src/app.mjs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { publicWorkOrder, exportWorkOrderMarkdown, rewriteWorkOrderResult } from '../src/work-order-view.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tokenai-test-'));
  const config = configuration({ TOKENAI_STATE_DIR: dir });
  const store = new Store(dir);
  addUser(store, { username: 'finance-a', name: '财务甲', tenant: 'company-a', password: 'test-only-password-a' });
  addUser(store, { username: 'finance-b', name: '财务乙', tenant: 'company-b', password: 'test-only-password-b' });
  const a = store.get('SELECT * FROM users WHERE username=?', 'finance-a');
  const b = store.get('SELECT * FROM users WHERE username=?', 'finance-b');
  const token = 'A'.repeat(43);
  store.run('INSERT INTO tokens VALUES(?,?,?)', hash(token), a.id, Date.now() + 60000);
  return { dir, config, store, a, b, token, cleanup() { this.store.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('PKCE code is bound to origin, single use, and account is checked', () => {
  const f = fixture();
  try {
    const verifier = 'v'.repeat(43), origin = f.config.allowedOrigins[1];
    const code = issueCode(f.store, f.config, { username: 'finance-a', password: 'test-only-password-a', origin, codeChallenge: challenge(verifier) });
    assert.throws(() => exchangeCode(f.store, { code, verifier: 'x'.repeat(43), origin }), /invalid|expired/);
    assert.throws(() => exchangeCode(f.store, { code, verifier, origin: f.config.publicOrigin }), /invalid|expired/);
    const result = exchangeCode(f.store, { code, verifier, origin });
    assert.equal(authenticate(f.store, { headers: { authorization: 'Bearer ' + result.accessToken } }).id, f.a.id);
    assert.throws(() => exchangeCode(f.store, { code, verifier, origin }), /invalid|expired/);
    f.store.run('UPDATE users SET disabled=1 WHERE id=?', f.a.id);
    assert.throws(() => authenticate(f.store, { headers: { authorization: 'Bearer ' + result.accessToken } }), /过期/);
  } finally { f.cleanup(); }
});

test('remembered sessions last seven days, and a short authorization cannot be upgraded during exchange', () => {
  const f = fixture();
  try {
    const verifier = 'v'.repeat(43), origin = f.config.publicOrigin;
    const input = { username: 'finance-a', password: 'test-only-password-a', origin, codeChallenge: challenge(verifier) };
    const code = issueCode(f.store, f.config, { ...input, remember: true });
    const remembered = exchangeCode(f.store, { code, verifier, origin });
    assert.equal(remembered.remember, true);
    assert.ok(remembered.expiresAt > Date.now() + 6 * 24 * 60 * 60000);
    const short = exchangeCode(f.store, { code: issueCode(f.store, f.config, input), verifier, origin, remember: true });
    assert.equal(short.remember, false);
    assert.ok(short.expiresAt < Date.now() + 31 * 60000);
    f.store.run('DELETE FROM tokens WHERE hash=?', hash(remembered.accessToken));
    assert.throws(() => authenticate(f.store, { headers: { authorization: 'Bearer ' + remembered.accessToken } }), /过期/);
  } finally { f.cleanup(); }
});

test('remember preference migration preserves an existing authorization-code table', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tokenai-migration-'));
  const legacy = new DatabaseSync(join(dir, 'tokenai.sqlite'));
  legacy.exec('CREATE TABLE codes(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,origin TEXT NOT NULL,challenge TEXT NOT NULL,expires INTEGER NOT NULL)');
  legacy.prepare('INSERT INTO codes VALUES(?,?,?,?,?)').run('old-code', 'old-user', 'https://tokenai.awiki.ai', 'challenge', Date.now() + 60000);
  legacy.close();
  const store = new Store(dir);
  try {
    assert.ok(store.get('SELECT * FROM codes WHERE hash=?', 'old-code'));
    assert.equal(store.all('PRAGMA table_info(codes)').length, 5, 'Old releases can still insert five-column codes after rollback');
    assert.equal(store.get('SELECT COUNT(*) AS n FROM auth_code_preferences').n, 0);
  }
  finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('fixed matter is idempotent, persists, and is isolated by tenant and membership', () => {
  const f = fixture();
  try {
    const a = f.store.ensureMatter(f.a), b = f.store.ensureMatter(f.b);
    assert.equal(f.store.ensureMatter(f.a).id, a.id);
    assert.notEqual(a.id, b.id);
    assert.equal(f.store.member(a.id, f.b), undefined);
    f.store.message(a.id, null, f.a.id, f.a.name, '保留的消息');
    f.store.close(); f.store = new Store(f.dir, { recover: true });
    assert.equal(f.store.ensureMatter(f.a).id, a.id);
    assert.equal(f.store.get('SELECT text FROM messages WHERE matter_id=?', a.id).text, '保留的消息');
  } finally { f.cleanup(); }
});

test('confirmation cannot be stolen, repeated or replayed after uncertain writes', async () => {
  const f = fixture();
  try {
    const tx = new TokenX({ ...f.config, writeEnabled: true });
    tx.validators.set('finance_expense_reimbursement', () => true);
    const matter = f.store.ensureMatter(f.a); f.store.ensureMatter(f.b);
    const op = tx.propose(f.store, matter.id, f.a, 'finance_expense_reimbursement', { file_id: 'opaque' });
    await assert.rejects(tx.confirm(f.store, op.operationId, f.b, true), /无权限/);
    let calls = 0;
    tx.call = async () => { calls++; throw new Error('network timeout after submission'); };
    assert.equal((await tx.confirm(f.store, op.operationId, f.a, true)).state, 'unknown');
    assert.equal((await tx.confirm(f.store, op.operationId, f.a, true)).state, 'unknown');
    assert.equal(calls, 1);
    const pending = tx.propose(f.store, matter.id, f.a, 'finance_expense_reimbursement', {});
    f.store.run('UPDATE operations SET expires=0 WHERE id=?', pending.operationId);
    assert.equal((await tx.confirm(f.store, pending.operationId, f.a, true)).state, 'expired');
    assert.equal(calls, 1);
  } finally { f.cleanup(); }
});

test('server rejects unapproved tools and scopes task reads to authorized runs', () => {
  const f = fixture();
  try {
    const tx = new TokenX(f.config), pi = new PiAgent(f.config, f.store, tx), matter = f.store.ensureMatter(f.a);
    assert.equal(tx.allowed('scenario_result'), true);
    assert.equal(tx.allowed('finance_expense_reimbursement'), false);
    assert.equal(tx.allowed('new_tool_from_server'), false);
    assert.throws(() => tx.validate('scenario_result', { run_id: 'known-run', include_share: true }), /单独的分享操作确认/);
    assert.throws(() => pi.scope(matter, 'scenario_result', { run_id: 'foreign-run' }), /未获得授权/);
    assert.throws(() => pi.scope(matter, 'scenario_result', {}), /未获得授权/);
    f.store.run('INSERT INTO runs VALUES(?,?,?,?,?,?,?)', uid(), matter.id, null, 'finance_expense_reimbursement', 'known-run', '{}', now());
    assert.doesNotThrow(() => pi.scope(matter, 'scenario_result', { run_id: 'known-run' }));
  } finally { f.cleanup(); }
});

test('startup marks in-flight work uncertain without replay', () => {
  const f = fixture();
  try {
    const matter = f.store.ensureMatter(f.a);
    f.store.run('INSERT INTO operations VALUES(?,?,?,?,?,?,?,?,?)', uid(), matter.id, f.a.id, 'scenario_cancel', '{}', 'executing', null, Date.now() + 10000, now());
    f.store.run('INSERT INTO turns VALUES(?,?,?,?,?,?,?)', uid(), matter.id, f.a.id, 'client-unique', 'hello', 'running', now());
    f.store.close(); f.store = new Store(f.dir, { recover: true });
    assert.equal(f.store.get('SELECT state FROM operations').state, 'unknown');
    assert.equal(f.store.get('SELECT status FROM turns').status, 'interrupted');
  } finally { f.cleanup(); }
});

test('work-order reads are enabled for the connector owner without requiring local runs', () => {
  const f = fixture();
  try {
    const config = { ...f.config, workOrderTenant: f.a.tenant };
    const tx = new TokenX(config), pi = new PiAgent(config, f.store, tx);
    const owner = f.store.ensureMatter(f.a), foreign = f.store.ensureMatter(f.b);
    tx.validators.set('scenario_work_orders', () => true);
    tx.validators.set('scenario_work_order', () => true);
    assert.equal(tx.allowed('scenario_work_orders', owner.tenant), true);
    assert.equal(tx.allowed('scenario_work_order', owner.tenant), true);
    assert.equal(tx.allowed('scenario_work_orders', foreign.tenant), false);
    assert.equal(new TokenX(f.config).allowed('scenario_work_orders'), false);
    assert.doesNotThrow(() => pi.scope(owner, 'scenario_work_orders', { date_from: '2026-10-28', date_to: '2026-10-28', scenario_type: 'contract_payment' }));
    assert.doesNotThrow(() => pi.scope(owner, 'scenario_work_order', { subject_id: 'remote-subject', include_detail: true, include_share: false }));
    assert.throws(() => pi.scope(foreign, 'scenario_work_orders', {}), /没有此 TokenX/);
    assert.throws(() => pi.scope(foreign, 'scenario_work_order', { subject_id: 'remote-subject' }), /没有此 TokenX/);
    assert.throws(() => tx.validate('scenario_work_order', { subject_id: 'remote-subject', include_share: true }), /单独的分享/);
    assert.doesNotThrow(() => tx.validate('scenario_work_orders', { date_from: '2026-10-28', date_to: '2026-10-28', page: 1, page_size: 20 }));
    assert.throws(() => tx.validate('scenario_work_orders', { date_from: '2026-02-30' }), /有效的/);
    assert.throws(() => tx.validate('scenario_work_orders', { date_from: '2026-99-99' }), /有效的/);
    assert.throws(() => tx.validate('scenario_work_orders', { date_from: '2026-10-29', date_to: '2026-10-28' }), /晚于/);
    assert.throws(() => tx.validate('scenario_work_orders', { page: 0 }), /正整数/);
    assert.throws(() => tx.validate('scenario_work_orders', { page_size: 101 }), /1 到 100/);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM runs').n, 0);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM operations').n, 0);
  } finally { f.cleanup(); }
});

test('HTTP rejects anonymous and foreign-origin access; retries create only one turn', async () => {
  const f = fixture(); let enqueued = 0;
  const tokenx = { status: { connected: false }, tools: [], allowed: () => false, close: async () => {} };
  const agent = { active: new Map(), enqueue() { enqueued++; }, close: async () => {} };
  const app = await buildApp(f.config, { store: f.store, tokenx, agent });
  try {
    const headers = { authorization: 'Bearer ' + f.token, origin: 'https://seanzhang9999.github.io' };
    assert.equal((await app.inject('/api/v1/me')).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/v1/me', headers: { ...headers, origin: 'https://evil.example' } })).statusCode, 403);
    const preflight = await app.inject({ method: 'OPTIONS', url: '/api/v1/matters/x/turns', headers: { origin: headers.origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } });
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], headers.origin);
    const matter = (await app.inject({ method: 'POST', url: '/api/v1/solutions/expense-control/matter:ensure', headers, payload: {} })).json();
    assert.ok(matter.id);
    const foreign = f.store.ensureMatter(f.b);
    assert.equal((await app.inject({ url: '/api/v1/matters/' + foreign.id + '/messages', headers })).statusCode, 404);
    const payload = { clientMessageId: 'unique-message-key-123', text: '有什么可用场景？' };
    const first = await app.inject({ method: 'POST', url: '/api/v1/matters/' + matter.id + '/turns', headers, payload });
    const retry = await app.inject({ method: 'POST', url: '/api/v1/matters/' + matter.id + '/turns', headers, payload });
    assert.equal(first.statusCode, 202); assert.equal(first.json().id, retry.json().id); assert.equal(enqueued, 1);
    assert.equal(f.store.all('SELECT * FROM messages WHERE matter_id=?', matter.id).length, 1);
    const stop = await app.inject({ method: 'POST', url: '/api/v1/matters/' + matter.id + '/turns/' + first.json().id + '/stop', headers, payload: {} });
    assert.equal(stop.statusCode, 200);
    assert.equal(f.store.get('SELECT status FROM turns').status, 'stopped');
    assert.equal((await app.inject('/status.js')).statusCode, 200);
  } finally { await app.close(); f.cleanup(); }
});

test('known secrets and Authorization values are removed from errors', () => {
  assert.equal(redact('key abc123 Authorization: Bearer sensitive-value', { deepseekKey: 'abc123' }), 'key [REDACTED] Authorization: Bearer [REDACTED]');
});

test('HTTP status scopes work-order availability to the connector organization', async () => {
  const f = fixture(), config = { ...f.config, workOrderTenant: f.a.tenant };
  const tx = new TokenX(config);
  tx.tools = [{ name: 'scenario_work_orders' }, { name: 'scenario_work_order' }];
  const agent = { active: new Map(), close: async () => {} };
  const app = await buildApp(config, { store: f.store, tokenx: tx, agent });
  const foreignToken = 'B'.repeat(43);
  f.store.run('INSERT INTO tokens VALUES(?,?,?)', hash(foreignToken), f.b.id, Date.now() + 60000);
  try {
    const owner = await app.inject({ url: '/api/v1/status', headers: { authorization: 'Bearer ' + f.token } });
    const foreign = await app.inject({ url: '/api/v1/status', headers: { authorization: 'Bearer ' + foreignToken } });
    assert.equal(owner.statusCode, 200); assert.equal(foreign.statusCode, 200);
    assert.ok(owner.json().mcp.tools.every(t => t.enabled));
    assert.ok(foreign.json().mcp.tools.every(t => !t.enabled));
  } finally { await app.close(); f.cleanup(); }
});

test('remote MCP redirects cannot forward the service Bearer credential to another origin', async () => {
  let destinationRequests = 0;
  const destination = createServer((req, res) => { destinationRequests++; res.end('unexpected'); });
  await new Promise(resolve => destination.listen(0, '127.0.0.1', resolve));
  const source = createServer((req, res) => { res.writeHead(302, { Location: 'http://127.0.0.1:' + destination.address().port + '/capture' }); res.end(); });
  await new Promise(resolve => source.listen(0, '127.0.0.1', resolve));
  const tx = new TokenX({ mcpToken: 'fixture-only-not-a-secret', mcpUrl: 'http://127.0.0.1:' + source.address().port + '/mcp' });
  try { await assert.rejects(tx.connect()); assert.equal(destinationRequests, 0); }
  finally { await tx.close(); await new Promise(resolve => source.close(resolve)); await new Promise(resolve => destination.close(resolve)); }
});

test('attachment upload uses an explicit schema mapping and never exposes bytes in approval arguments', () => {
  const f = fixture();
  try {
    const tx = new TokenX({ ...f.config, writeEnabled: true, uploadContentField: 'content_base64', uploadNameField: 'filename', uploadEncoding: 'base64' });
    tx.tools = [{ name: 'scenario_upload_file', inputSchema: { type: 'object', properties: { content_base64: { type: 'string' }, filename: { type: 'string' } }, required: ['content_base64', 'filename'] } }];
    tx.validators.set('scenario_upload_file', tx.ajv.compile(tx.tools[0].inputSchema));
    const matter = f.store.ensureMatter(f.a), other = f.store.ensureMatter(f.b), fileId = uid(), path = join(f.dir, 'attachment');
    writeFileSync(path, 'private fixture document');
    f.store.run('INSERT INTO files VALUES(?,?,?,?,?,?,?,?)', fileId, matter.id, f.a.id, 'fixture.txt', 'text/plain', path, 24, now());
    assert.throws(() => tx.attachmentArgs(f.store, other.id, fileId), /不属于/);
    const args = tx.attachmentArgs(f.store, matter.id, fileId);
    assert.equal(Buffer.from(args.content_base64, 'base64').toString(), 'private fixture document');
    const pending = tx.proposeAttachment(f.store, matter.id, f.a, fileId);
    const saved = f.store.get('SELECT args FROM operations WHERE id=?', pending.operationId).args;
    assert.equal(saved.includes('private fixture document'), false);
    assert.equal(saved.includes(args.content_base64), false);
    tx.config.uploadContentField = 'wrong_schema_field';
    assert.throws(() => tx.attachmentArgs(f.store, matter.id, fileId), /尚未/);
  } finally { f.cleanup(); }
});

test('work-order pages and report exports use TokenAI authentication and never fetch localhost URLs', async () => {
  const f = fixture(), config = { ...f.config, workOrderTenant: f.a.tenant };
  const id = '11111111-1111-4111-8111-111111111111', calls = [];
  const data = { subject_id: id, title: '测试合同审核', status: 'reviewed', risk_level: 'high', scenario_type: 'contract_payment', audit_summary: '请核对付款条件', rule_summary: { passed: 1, failed: 1 }, rule_results: [{ name: '付款节点', status: 'failed', summary: '材料不完整', evidence: ['合同附件缺失'], suggestion: '补齐附件' }], console_url: 'http://localhost:8089/doc?subjectId=' + id, report: { file_name: 'contract.pdf_审核报告.md', report_url: 'http://localhost:8089/files/private/file-preview?sign=private-signature' } };
  const tokenx = { status: {}, tools: [], allowed: () => true, close: async () => {}, call: async (name, args) => { calls.push({ name, args }); return { content: [{ type: 'text', text: JSON.stringify(data) }] }; } };
  const app = await buildApp(config, { store: f.store, tokenx, agent: { active: new Map(), close: async () => {} } });
  const headers = { authorization: 'Bearer ' + f.token, origin: config.allowedOrigins[1] };
  const foreignToken = 'B'.repeat(43);
  f.store.run('INSERT INTO tokens VALUES(?,?,?)', hash(foreignToken), f.b.id, Date.now() + 60000);
  try {
    assert.equal((await app.inject('/work-orders/' + id)).statusCode, 200);
    assert.equal((await app.inject('/api/v1/work-orders/' + id)).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/v1/work-orders/' + id, headers: { authorization: 'Bearer ' + foreignToken } })).statusCode, 403);
    assert.equal((await app.inject({ url: '/api/v1/work-orders/not-a-subject', headers })).statusCode, 400);
    const detail = await app.inject({ url: '/api/v1/work-orders/' + id, headers });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().console_url, config.publicOrigin + '/work-orders/' + id);
    assert.equal(detail.json().report.original_file_available, false);
    assert.equal(detail.body.includes('localhost'), false);
    assert.equal(detail.body.includes('private-signature'), false);
    const download = await app.inject({ url: '/api/v1/work-orders/' + id + '/report', headers });
    assert.equal(download.statusCode, 200);
    assert.match(download.headers['content-type'], /text\/markdown/);
    assert.match(download.headers['content-disposition'], /attachment/);
    assert.equal(download.headers['x-tokenai-report-source'], 'structured-export');
    assert.ok(download.body.includes('合同附件缺失'));
    assert.ok(download.body.includes('不等同于控制台原报告文件'));
    assert.equal(download.body.includes('localhost'), false);
    assert.ok(calls.every(c => c.name === 'scenario_work_order' && c.args.include_share === false));
    const rewritten = publicWorkOrder(data, config.publicOrigin);
    const mcp = rewriteWorkOrderResult({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data }, config.publicOrigin);
    assert.equal(JSON.stringify(mcp).includes('localhost'), false);
    assert.equal(JSON.stringify(mcp).includes('private-signature'), false);
    assert.equal(publicWorkOrder(rewritten, config.publicOrigin).report.file_name, rewritten.report.file_name);
    assert.ok(exportWorkOrderMarkdown(rewritten).includes('补齐附件'));
  } finally { await app.close(); f.cleanup(); }
});
