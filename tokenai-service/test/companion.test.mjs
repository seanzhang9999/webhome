import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store, uid, now } from '../src/store.mjs';
import { addUser, hash } from '../src/auth.mjs';
import { configuration } from '../src/config.mjs';
import { FinanceCompanion } from '../src/companion.mjs';
import { buildApp } from '../src/app.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tokenai-companion-')), config = configuration({ TOKENAI_STATE_DIR: dir }), store = new Store(dir);
  for (const [username, tenant] of [['manager-a','company-a'], ['manager-b','company-a'], ['outsider','company-b']]) addUser(store, { username, name: username, tenant, password: 'fixture-password-123' });
  const users = store.all('SELECT * FROM users ORDER BY username'), a = users.find(u => u.username === 'manager-a'), b = users.find(u => u.username === 'manager-b'), outsider = users.find(u => u.username === 'outsider');
  const matter = store.ensureMatter(a); store.ensureMatter(b); store.ensureMatter(outsider);
  return { dir, config, store, a, b, outsider, matter, cleanup() { store.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('companion follows new main-chat results and caches unchanged advice without posting shared messages', async () => {
  const f = fixture(); let calls = 0;
  const companion = new FinanceCompanion(f.config, f.store, { generate: async ({ sourceSeq, messages }) => { calls++; assert.ok(messages.length); return '## 建议\n\n基于消息 ' + sourceSeq; } });
  try {
    assert.equal(companion.request(f.matter, f.a).status, 'idle'); assert.equal(calls, 0);
    f.store.message(f.matter.id, null, f.a.id, f.a.name, '查询付款审核');
    f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '审核发现缺少验收附件');
    assert.equal(companion.request(f.matter, f.a).status, 'generating');
    await companion.settled(); const first = companion.request(f.matter, f.a);
    assert.equal(first.status, 'ready'); assert.equal(calls, 1);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', f.matter.id).n, 2);
    f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '已补充新的审核结果');
    companion.request(f.matter, f.a); await companion.settled();
    assert.ok(companion.result(f.matter, f.a).sourceSeq > first.sourceSeq); assert.equal(calls, 2);
    companion.request(f.matter, f.a, true); await companion.settled(); assert.equal(calls, 3);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM operations').n, 0);
  } finally { await companion.close(); f.cleanup(); }
});

test('companion waits for main reply and keeps private advice separate even for members of one matter', async () => {
  const f = fixture(); let calls = 0;
  const companion = new FinanceCompanion(f.config, f.store, { generate: async ({ user }) => { calls++; return 'private-for-' + user.id; } });
  const turnId = uid(); f.store.message(f.matter.id, turnId, f.a.id, f.a.name, '主聊天正在处理');
  f.store.run('INSERT INTO turns VALUES(?,?,?,?,?,?,?)', turnId, f.matter.id, f.a.id, uid(), '处理中', 'running', now());
  const app = await buildApp(f.config, { store: f.store, companion, agent: { active: new Map(), close: async () => {} }, tokenx: { status: {}, tools: [], close: async () => {} } });
  const tokens = new Map();
  for (const [index, user] of [f.a, f.b, f.outsider].entries()) { const token = String.fromCharCode(65 + index).repeat(43); tokens.set(user.id, token); f.store.run('INSERT INTO tokens VALUES(?,?,?)', hash(token), user.id, Date.now() + 60000); }
  try {
    assert.equal(companion.request(f.matter, f.a).status, 'waiting'); assert.equal(calls, 0);
    f.store.run("UPDATE turns SET status='completed' WHERE id=?", turnId);
    companion.request(f.matter, f.a); companion.request(f.matter, f.b); await companion.settled();
    assert.notEqual(companion.result(f.matter, f.a).text, companion.result(f.matter, f.b).text);
    const url = '/api/v1/matters/' + f.matter.id + '/companion';
    assert.equal((await app.inject(url)).statusCode, 401);
    assert.equal((await app.inject({ url, headers: { authorization: 'Bearer ' + tokens.get(f.outsider.id) } })).statusCode, 404);
    const own = await app.inject({ url: url + '?user_id=' + f.b.id, headers: { authorization: 'Bearer ' + tokens.get(f.a.id) } });
    assert.equal(own.json().text, 'private-for-' + f.a.id);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages').n, 1);
  } finally { await app.close(); f.cleanup(); }
});

test('new messages are picked up after an active analysis and errors do not cause endless automatic retries', async () => {
  const f = fixture(); let release, calls = 0, fail = false;
  const companion = new FinanceCompanion({ ...f.config, deepseekKey: 'fixture-private-key' }, f.store, { generate: async ({ sourceSeq }) => {
    calls++; if (calls === 1) return new Promise(resolve => { release = resolve; });
    if (fail) throw new Error('provider error fixture-private-key'); return 'advice-' + sourceSeq;
  } });
  try {
    const first = f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '第一版结果');
    companion.request(f.matter, f.a); await Promise.resolve();
    const latest = f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '第二版结果');
    assert.equal(companion.request(f.matter, f.a).status, 'generating');
    release('first advice'); await companion.settled(); assert.equal(companion.result(f.matter, f.a).sourceSeq, first.seq);
    companion.request(f.matter, f.a); await companion.settled(); assert.equal(companion.result(f.matter, f.a).sourceSeq, latest.seq);
    fail = true; companion.request(f.matter, f.a, true); await companion.settled();
    const failed = companion.request(f.matter, f.a); assert.equal(failed.status, 'error'); assert.equal(failed.error.includes('fixture-private-key'), false);
    const before = calls; companion.request(f.matter, f.a); await companion.settled(); assert.equal(calls, before);
  } finally { await companion.close(); f.cleanup(); }
});
