// Run explicitly against the deployed service. It uses a private temporary matter
// in the authorized connector organization and never touches the real fixed matter.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdirSync, chownSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { Store } from '../src/store.mjs';
import { addUser } from '../src/auth.mjs';
import { loadEnvironment, configuration } from '../src/config.mjs';

loadEnvironment('/etc/tokenai-agent/environment');
const config = configuration(), stateDir = '/var/lib/tokenai-agent';
assert.ok(config.workOrderTenant, 'A connector owner must be configured');
const store = new Store(stateDir), tag = randomUUID(), matterId = randomUUID();
const username = 'acceptance-' + tag, password = randomBytes(24).toString('base64url');
addUser(store, { username, password, name: '工单查询验收', tenant: config.workOrderTenant });
const user = store.get('SELECT * FROM users WHERE username=?', username);
store.run('INSERT INTO matters(id,tenant,business_key,title) VALUES(?,?,?,?)', matterId, user.tenant, 'acceptance-' + tag, '隔离工单查询验收');
store.run('INSERT INTO members VALUES(?,?)', matterId, user.id);
const workDir = join(stateDir, 'workspaces', matterId), sessionsDir = join(stateDir, 'sessions', matterId);
for (const dir of [workDir, sessionsDir]) mkdirSync(dir, { recursive: true, mode: 0o700 });
const manager = SessionManager.create(workDir, sessionsDir);
manager.appendMessage({ role: 'user', content: [{ type: 'text', text: '可以按日期查询合同付款工单吗？' }], timestamp: Date.now() - 10000 });
manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: '旧能力下不能按日期列工单，需要先提供 run_id。' }], api: 'openai-completions', provider: 'tokenai-deepseek', model: config.model, stopReason: 'stop', timestamp: Date.now() - 9000, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } });
store.run('UPDATE matters SET session_file=? WHERE id=?', manager.getSessionFile(), matterId);
const serviceUid = Number(execFileSync('id', ['-u', 'tokenai'], { encoding: 'utf8' }).trim());
const serviceGid = Number(execFileSync('id', ['-g', 'tokenai'], { encoding: 'utf8' }).trim());
for (const dir of [workDir, sessionsDir]) { chownSync(dir, serviceUid, serviceGid); for (const name of readdirSync(dir)) chownSync(join(dir, name), serviceUid, serviceGid); }
let token;
const api = async (path, body) => {
  const r = await fetch('https://tokenai.awiki.ai' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: config.publicOrigin, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Production API returned HTTP ' + r.status);
  return r.json();
};
try {
  const verifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
  const code = (await api('/api/v1/auth/login', { username, password, origin: config.publicOrigin, codeChallenge })).code;
  token = (await api('/api/v1/auth/token', { code, verifier, origin: config.publicOrigin })).accessToken;
  const status = await api('/api/v1/status');
  for (const name of ['scenario_work_orders', 'scenario_work_order']) assert.ok(status.mcp.tools.some(t => t.name === name && t.enabled));
  const turn = await api('/api/v1/matters/' + matterId + '/turns', { clientMessageId: randomUUID(), text: '请查询2026年10月28日的合同付款审核明细，说明每笔工单的审核状态、风险和审核结论。' });
  const deadline = Date.now() + 180000;
  let row;
  do {
    row = store.get('SELECT status FROM turns WHERE id=?', turn.id);
    if (!['queued', 'running', 'stopping'].includes(row?.status)) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  assert.equal(row?.status, 'completed');
  const completed = store.all("SELECT data FROM events WHERE turn_id=? AND type='tool_completed'", turn.id).map(e => JSON.parse(e.data));
  for (const tool of ['tokenx_scenario_work_orders', 'tokenx_scenario_work_order']) assert.ok(completed.some(e => e.tool === tool && !e.isError), 'A real work-order MCP call must complete');
  const answer = store.get("SELECT text FROM messages WHERE turn_id=? AND actor='tokenai' ORDER BY seq DESC LIMIT 1", turn.id)?.text || '';
  assert.ok(answer.length > 50);
  assert.equal(/请.{0,15}提供.{0,15}run_id|需要您提供.*run_id|不能按日期/.test(answer), false);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM operations WHERE matter_id=?', matterId).n, 0);
  assert.equal(store.get('SELECT session_file FROM matters WHERE id=?', matterId).session_file, manager.getSessionFile());
  console.log(JSON.stringify({ endpoint: 'production HTTPS API', naturalDateQuery: 'passed', staleHistoryPreserved: true, workOrderList: 'passed', workOrderDetail: 'passed', asksForRunId: false, answerChars: answer.length, businessWrites: 0 }));
} finally {
  const deadline = Date.now() + 190000;
  while (store.get("SELECT COUNT(*) AS n FROM turns WHERE matter_id=? AND status IN ('queued','running','stopping')", matterId).n && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 250));
  if (store.get("SELECT COUNT(*) AS n FROM turns WHERE matter_id=? AND status IN ('queued','running','stopping')", matterId).n) throw new Error('Preserve active private acceptance scope for later cleanup');
  if (token) await api('/api/v1/auth/logout', {}).catch(() => {});
  for (const table of ['messages', 'events', 'turns', 'operations', 'runs', 'files', 'members']) store.run('DELETE FROM ' + table + ' WHERE matter_id=?', matterId);
  store.run('DELETE FROM matters WHERE id=? AND business_key=?', matterId, 'acceptance-' + tag);
  store.run('DELETE FROM tokens WHERE user_id=?', user.id); store.run('DELETE FROM codes WHERE user_id=?', user.id); store.run('DELETE FROM users WHERE id=?', user.id);
  await rm(workDir, { recursive: true, force: true }); await rm(sessionsDir, { recursive: true, force: true });
  store.close();
}
