import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Store, uid, now } from './store.mjs';
import { authenticate, issueCode, exchangeCode, hash } from './auth.mjs';
import { TokenX, resultText } from './tokenx.mjs';
import { requireWorkOrderAccess, publicWorkOrder, exportWorkOrderMarkdown } from './work-order-view.mjs';
import { PiAgent } from './agent.mjs';
import { FinanceCompanion } from './companion.mjs';
import { redact } from './config.mjs';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const frontendPath = fileURLToPath(new URL('../../tokenai-expense.js', import.meta.url));
const bad = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const objectBody = req => { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw bad(400, 'JSON object required'); return req.body; };

export async function buildApp(config, overrides = {}) {
  const app = Fastify({ logger: false, bodyLimit: 65536, trustProxy: ['127.0.0.1', '::1'], forceCloseConnections: true });
  const store = overrides.store || new Store(config.stateDir, { recover: true });
  const tokenx = overrides.tokenx || new TokenX(config);
  const agent = overrides.agent || new PiAgent(config, store, tokenx);
  const companion = overrides.companion || new FinanceCompanion(config, store, { runtime: () => agent.runtime(), readWorkOrder });
  if (!companion.readWorkOrder) companion.readWorkOrder = readWorkOrder;
  app.decorate('services', { store, tokenx, agent, companion });
  const loginAttempts = new Map();
  await app.register(cors, { origin: (origin, cb) => cb(null, !origin || config.allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type'], exposedHeaders: ['Content-Disposition', 'X-TokenAI-Report-Source'], maxAge: 600 });
  await app.register(multipart, { limits: { fileSize: config.fileLimit, files: 1, fields: 0, parts: 1 } });
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff').header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (req.headers.origin && !config.allowedOrigins.includes(req.headers.origin)) throw bad(403, 'Origin not allowed');
  });
  app.setErrorHandler((error, req, reply) => {
    const code = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    reply.code(code).send({ error: code === 500 ? '请求未完成，请检查服务状态或联系管理员' : redact(error.message, config) });
  });
  function member(req) {
    const user = authenticate(store, req), matter = store.member(req.params.matterId, user);
    if (!matter) throw bad(404, '事项不存在或未授权');
    return { user, matter };
  }
  const rate = (key, limit, windowMs) => {
    const time = Date.now(), existing = loginAttempts.get(key);
    const value = existing && existing.until > time ? existing : { count: 0, until: time + windowMs };
    if (loginAttempts.size > 5000) for (const [k, v] of loginAttempts) if (v.until < time) loginAttempts.delete(k);
    value.count++; loginAttempts.set(key, value);
    if (value.count > limit) throw bad(429, '请求过于频繁，请稍后再试');
  };
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/', async (req, reply) => reply.type('text/html').send(await readFile(join(publicDir, 'index.html'), 'utf8')));
  app.get('/work-orders/:subjectId', async (req, reply) => reply.type('text/html').send(await readFile(join(publicDir, 'index.html'), 'utf8')));
  app.get('/work-orders/:subjectId/report', async (req, reply) => reply.type('text/html').send(await readFile(join(publicDir, 'index.html'), 'utf8')));
  app.get('/auth', async (req, reply) => reply.type('text/html').send(await readFile(join(publicDir, 'auth.html'), 'utf8')));
  app.get('/auth.js', async (req, reply) => reply.type('application/javascript').send(await readFile(join(publicDir, 'auth.js'), 'utf8')));
  app.get('/status.js', async (req, reply) => reply.type('application/javascript').send(await readFile(join(publicDir, 'status.js'), 'utf8')));
  app.get('/tokenai-expense.js', async (req, reply) => reply.type('application/javascript').send(await readFile(frontendPath, 'utf8')));
  app.get('/tokenai-markdown.js', async (req, reply) => reply.type('application/javascript').send(await readFile(fileURLToPath(new URL('../../tokenai-markdown.js', import.meta.url)), 'utf8')));
  app.get('/tokenai-markdown.css', async (req, reply) => reply.type('text/css').send(await readFile(fileURLToPath(new URL('../../tokenai-markdown.css', import.meta.url)), 'utf8')));
  app.get('/api/v1/me', async req => {
    const u = authenticate(store, req); return { id: u.id, name: u.name, tenant: u.tenant, role: 'finance' };
  });
  app.post('/api/v1/auth/login', async req => {
    rate('login:' + req.ip, 8, 10 * 60000);
    const b = objectBody(req);
    if (typeof b.username !== 'string' || typeof b.password !== 'string' || b.username.length > 120 || b.password.length > 256) throw bad(400, '账号或密码格式不正确');
    return { code: issueCode(store, config, b) };
  });
  app.post('/api/v1/auth/token', async req => {
    rate('token:' + req.ip, 30, 60000);
    const b = objectBody(req);
    if (req.headers.origin && b.origin !== req.headers.origin) throw bad(403, 'Origin mismatch');
    if (!config.allowedOrigins.includes(b.origin)) throw bad(403, 'Origin not allowed');
    return exchangeCode(store, b);
  });
  app.post('/api/v1/auth/logout', async req => {
    authenticate(store, req); store.run('DELETE FROM tokens WHERE hash=?', hash(req.headers.authorization.slice(7)));
    return { ok: true };
  });
  app.get('/api/v1/status', async req => {
    const user = authenticate(store, req);
    return { application: 'TokenAI', version: '1.0.0', piVersion: '1.4.0', uptime: Math.floor(process.uptime()),
      model: { name: config.model, configured: !!config.deepseekKey, lastCheck: agent.lastModelCheck },
      mcp: { ...tokenx.status, discoveredTools: tokenx.tools.length, tools: tokenx.tools.map(t => ({ name: t.name, enabled: tokenx.allowed(t.name, user.tenant) })) },
      activeTurns: agent.active?.size || 0 };
  });
  app.get('/api/v1/solutions', async req => {
    authenticate(store, req); return [{ id: 'expense-control', name: '报销费控协同方案', agent: 'tokenai', connected: tokenx.status.connected }];
  });
  async function workOrder(req) { return readWorkOrder(authenticate(store, req), req.params.subjectId); }
  async function readWorkOrder(user, id) {
    requireWorkOrderAccess(config, user, id);
    try {
      const result = await tokenx.call('scenario_work_order', { subject_id: id, include_detail: true, include_share: false });
      const data = JSON.parse(resultText(result));
      if (data.subject_id !== id) throw new Error('Mismatched work-order response');
      return publicWorkOrder(data, config.publicOrigin);
    } catch(e) { throw bad(e.toolError ? 404 : 400, e.toolError ? '工单不存在或无法读取' : '暂时无法读取审核结果，请稍后重试'); }
  }
  app.get('/api/v1/work-orders/:subjectId', async req => workOrder(req));
  app.get('/api/v1/work-orders/:subjectId/report', async (req, reply) => {
    const data = await workOrder(req);
    const encoded = encodeURIComponent(data.report.file_name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    reply.header('Content-Disposition', "attachment; filename=\"audit-result.md\"; filename*=UTF-8''" + encoded);
    reply.header('X-TokenAI-Report-Source', 'structured-export');
    return reply.type('text/markdown; charset=utf-8').send(exportWorkOrderMarkdown(data));
  });
  app.post('/api/v1/solutions/expense-control/matter:ensure', async req => {
    const user = authenticate(store, req); return store.ensureMatter(user);
  });
  app.get('/api/v1/matters/:matterId', async req => {
    const { matter } = member(req);
    const humans = store.all('SELECT u.id,u.name FROM users u JOIN members m ON m.user_id=u.id WHERE m.matter_id=? AND u.disabled=0', matter.id);
    return { id: matter.id, title: matter.title, members: [...humans.map(u => ({ ...u, kind: 'human' })), { id: 'tokenai', name: 'TokenAI 报销费控助手', kind: 'agent' }] };
  });
  app.get('/api/v1/matters/:matterId/messages', async req => {
    const { matter } = member(req);
    const before = Number(req.query.before || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before < 1) throw bad(400, 'Invalid cursor');
    const rows = store.all('SELECT * FROM messages WHERE matter_id=? AND seq<? ORDER BY seq DESC LIMIT 100', matter.id, before);
    return { messages: rows.reverse(), before: rows[0]?.seq || null, eventCursor: store.get('SELECT MAX(seq) AS seq FROM events WHERE matter_id=?', matter.id).seq || 0 };
  });
  app.get('/api/v1/matters/:matterId/runs', async req => {
    const { matter } = member(req);
    return { runs: store.all('SELECT * FROM runs WHERE matter_id=? ORDER BY created DESC LIMIT 100', matter.id) };
  });
  app.get('/api/v1/matters/:matterId/companion', async req => {
    const { user, matter } = member(req); return companion.request(matter, user);
  });
  app.post('/api/v1/matters/:matterId/companion:refresh', async req => {
    const { user, matter } = member(req); rate('companion:' + user.id, 6, 60000); return companion.request(matter, user, true);
  });
  app.get('/api/v1/matters/:matterId/companion/questions', async req => {
    const { user, matter } = member(req); return { questions: companion.questions(matter, user, req.query.subjectId) };
  });
  app.post('/api/v1/matters/:matterId/companion/questions', async (req, reply) => {
    const { user, matter } = member(req); rate('companion-question:' + user.id, 8, 60000);
    const result = companion.ask(matter, user, objectBody(req)); reply.code(202); return result;
  });
  app.get('/api/v1/matters/:matterId/operations', async req => {
    const { matter } = member(req);
    store.run("UPDATE operations SET state='expired' WHERE matter_id=? AND state='pending' AND expires<?", matter.id, Date.now());
    return { operations: store.all('SELECT id,user_id,tool,args,state,result,expires,created FROM operations WHERE matter_id=? ORDER BY created DESC LIMIT 50', matter.id).map(o => ({ ...o, args: JSON.parse(o.args), result: o.result ? JSON.parse(o.result) : null })) };
  });
  app.post('/api/v1/matters/:matterId/turns', async (req, reply) => {
    const { user, matter } = member(req), b = objectBody(req);
    if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 12000 || !/^[A-Za-z0-9_-]{16,80}$/.test(b.clientMessageId || '')) throw bad(400, '消息或唯一消息标识不正确');
    const existing = store.get('SELECT id,status FROM turns WHERE matter_id=? AND user_id=? AND client_id=?', matter.id, user.id, b.clientMessageId);
    if (existing) return existing;
    rate('turn:' + user.id, 15, 60000);
    if (store.get("SELECT COUNT(*) AS n FROM turns WHERE matter_id=? AND status IN ('queued','running')", matter.id).n >= 5) throw bad(429, '事项中等待处理的消息较多，请稍后再发');
    const turn = { id: uid(), text: b.text.trim() };
    store.transaction(() => {
      store.run('INSERT INTO turns VALUES(?,?,?,?,?,?,?)', turn.id, matter.id, user.id, b.clientMessageId, turn.text, 'queued', now());
      store.message(matter.id, turn.id, user.id, user.name, turn.text);
      store.event(matter.id, turn.id, 'message_created', { turnId: turn.id });
    });
    agent.enqueue(matter, user, turn);
    reply.code(202); return { id: turn.id, status: 'queued' };
  });
  app.post('/api/v1/matters/:matterId/turns/:turnId/stop', async req => {
    const { user, matter } = member(req);
    const turn = store.get('SELECT * FROM turns WHERE id=? AND matter_id=? AND user_id=?', req.params.turnId, matter.id, user.id);
    if (!turn) throw bad(404, '任务不存在');
    if (turn.status === 'queued') store.run("UPDATE turns SET status='stopped' WHERE id=?", turn.id);
    if (turn.status === 'running') { store.run("UPDATE turns SET status='stopping' WHERE id=?", turn.id); await agent.stop(turn.id); }
    return { stopped: true, businessTaskCancelled: false };
  });
  app.post('/api/v1/operations/:operationId/confirm', async req => {
    const user = authenticate(store, req), b = objectBody(req);
    if (typeof b.approve !== 'boolean') throw bad(400, 'approve must be boolean');
    return tokenx.confirm(store, req.params.operationId, user, b.approve);
  });
  app.post('/api/v1/matters/:matterId/files', async req => {
    const { user, matter } = member(req);
    const file = await req.file(); if (!file) throw bad(400, '请选择文件');
    if (!['application/pdf','image/png','image/jpeg','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/octet-stream'].includes(file.mimetype)) throw bad(400, '不支持此附件类型');
    const bytes = await file.toBuffer();
    if (file.file.truncated) throw bad(413, '文件超过大小限制');
    const id = uid(), dir = join(config.stateDir, 'files'); mkdirSync(dir, { recursive: true, mode: 0o700 });
    const path = join(dir, id);
    await writeFile(path, bytes, { mode: 0o600, flag: 'wx' });
    try { store.run('INSERT INTO files VALUES(?,?,?,?,?,?,?,?)', id, matter.id, user.id, String(file.filename).slice(0,200), file.mimetype, path, bytes.length, now()); }
    catch(e) { await unlink(path); throw e; }
    return { id, name: String(file.filename).slice(0,200), size: bytes.length, notice: '附件已保存到本事项，尚未上传到 TokenX。' };
  });
  app.get('/api/v1/matters/:matterId/events', async (req, reply) => {
    const { matter } = member(req);
    let cursor = Number(req.query.after || 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw bad(400, 'Invalid cursor');
    reply.hijack();
    const origin = req.headers.origin;
    reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) });
    const expires = store.get('SELECT expires FROM tokens WHERE hash=?', hash(req.headers.authorization.slice(7))).expires;
    let closed = false;
    const send = () => {
      if (closed) return;
      try {
        const authorized = store.member(matter.id, authenticate(store, req));
        if (!authorized || Date.now() > expires) { reply.raw.end(); return; }
        for (const e of store.all('SELECT * FROM events WHERE matter_id=? AND seq>? ORDER BY seq LIMIT 100', matter.id, cursor)) {
          reply.raw.write('id: ' + e.seq + '\nevent: ' + e.type + '\ndata: ' + JSON.stringify({ ...JSON.parse(e.data), seq: e.seq, turnId: e.turn_id }) + '\n\n'); cursor = e.seq;
        }
        reply.raw.write(': heartbeat\n\n');
      } catch { reply.raw.end(); }
    };
    send();
    const timer = setInterval(send, 750);
    reply.raw.on('close', () => { closed = true; clearInterval(timer); });
  });
  app.addHook('onClose', async () => { await companion.close(); await agent.close(); await tokenx.close(); if (!overrides.store) store.close(); });
  return app;
}
