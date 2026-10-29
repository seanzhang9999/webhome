// Explicit production acceptance using a temporary account in the authorized
// connector organization. No shared messages or TokenX business writes are sent.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium } from '@playwright/test';
import { Store } from '../src/store.mjs';
import { addUser } from '../src/auth.mjs';
import { loadEnvironment, configuration } from '../src/config.mjs';
import { SUBJECT_ID } from '../src/work-order-view.mjs';
loadEnvironment('/etc/tokenai-agent/environment');
const config = configuration(), subjectId = process.env.TOKENAI_REPORT_SUBJECT_ID;
assert.ok(config.workOrderTenant && SUBJECT_ID.test(subjectId || ''), 'Use an authorized work-order ID');
const store = new Store('/var/lib/tokenai-agent'), tag = randomUUID(), username = 'acceptance-audit-' + tag, password = randomBytes(24).toString('base64url');
addUser(store, { username, password, name: '审核伙伴验收', tenant: config.workOrderTenant });
const user = store.get('SELECT * FROM users WHERE username=?', username);
let browser, context;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--no-proxy-server','--disable-features=NetworkServiceSandbox'], ...(process.env.TOKENAI_BROWSER_PATH ? { executablePath: process.env.TOKENAI_BROWSER_PATH } : {}) });
  context = await browser.newContext();
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://tokenai.awiki.ai/work-orders/' + subjectId);
  const popupPromise = page.waitForEvent('popup'); await page.locator('[data-expense-action=login]').click();
  const popup = await popupPromise; await popup.locator('[name=username]').fill(username); await popup.locator('[name=password]').fill(password); await popup.getByRole('button', { name: '登录并连接事项' }).click();
  const dialog = page.getByRole('dialog', { name: '工单审核明细' }); await dialog.waitFor({ timeout: 45000 });
  const partner = dialog.getByRole('complementary', { name: '当前工单的私人 AI 伙伴' }); await partner.waitFor();
  await partner.locator('textarea').fill('请只依据当前工单，列出一个实际存在的规则编号，简要解释该规则的结论和证据，再给我一条待核实事项；没有依据就明确说明。');
  await partner.locator('form [type=submit]').click();
  await partner.locator('.audit-private-answer .tokenai-markdown').waitFor({ timeout: 90000 });
  const row = store.get('SELECT q.id,q.status,q.answer,c.subject_id,c.snapshot_json FROM companion_questions q JOIN companion_question_contexts c ON c.question_id=q.id WHERE q.user_id=?', user.id);
  assert.equal(row.status, 'completed'); assert.equal(row.subject_id, subjectId); assert.ok(row.answer.length > 30);
  const snapshot = JSON.parse(row.snapshot_json); assert.equal(snapshot.subjectId, subjectId); assert.ok(snapshot.summary || snapshot.rules.length);
  const codes = snapshot.rules.map(r => r.code).filter(Boolean); if (codes.length) assert.ok(codes.some(code => row.answer.includes(code)), 'Answer should refer to a rule from the selected work order');
  assert.equal(store.get('SELECT COUNT(*) AS n FROM messages WHERE actor=?', user.id).n, 0);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM operations WHERE user_id=?', user.id).n, 0);
  await page.reload(); await dialog.waitFor({ timeout: 45000 }); await dialog.locator('.audit-private-answer .tokenai-markdown').waitFor();
  assert.equal(await dialog.locator('.audit-private-qa').count(), 1);
  assert.equal(await dialog.locator('.audit-technical pre:visible').count(), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ realMcpContext: true, realDeepSeekAnswer: true, selectedWorkOrder: 'matched', rulesInAnswer: codes.length ? 'matched' : 'no codes supplied', privateHistoryAfterReload: 'passed', sharedMessagesSent: 0, businessWrites: 0, browserErrors: 0 }));
} finally {
  await context?.close(); await browser?.close();
  const until = Date.now() + 90000;
  while (Date.now() < until && (store.get("SELECT COUNT(*) AS n FROM companion_questions WHERE user_id=? AND status IN ('queued','running')", user.id).n || store.get("SELECT COUNT(*) AS n FROM companion_advice WHERE user_id=? AND status='generating'", user.id).n)) await new Promise(resolve => setTimeout(resolve, 500));
  if (store.get("SELECT COUNT(*) AS n FROM companion_questions WHERE user_id=? AND status IN ('queued','running')", user.id).n || store.get("SELECT COUNT(*) AS n FROM companion_advice WHERE user_id=? AND status='generating'", user.id).n) throw new Error('Preserve active temporary audit acceptance account for exact cleanup');
  store.transaction(() => {
    store.run('DELETE FROM members WHERE user_id=?', user.id); store.run('DELETE FROM tokens WHERE user_id=?', user.id); store.run('DELETE FROM codes WHERE user_id=?', user.id); store.run('DELETE FROM users WHERE id=? AND username=?', user.id, username);
  });
  store.close();
}
