// Explicit focused smoke against the deployed service. Uses a temporary tenant.
// It never calls a TokenX write tool and cleans up only its own exact identifiers.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { Store } from '../src/store.mjs';
import { addUser } from '../src/auth.mjs';

const stateDir = process.env.TOKENAI_SMOKE_STATE || '/var/lib/tokenai-agent';
const pageUrl = process.env.TOKENAI_SMOKE_PAGE || (process.env.TOKENAI_SMOKE_SOURCE === '1' ? 'https://seanzhang9999.github.io/webhome/awiki-coffee-trusted-space-v55-cfo.html' : 'https://tokenai.awiki.info');
const checkMcp = process.env.TOKENAI_SMOKE_MCP === '1';
const store = new Store(stateDir);
const tag = randomUUID(), username = 'acceptance-' + tag;
const password = randomBytes(24).toString('base64url');
addUser(store, { username, password, name: '上线验收财务', tenant: 'acceptance-' + tag });
const user = store.get('SELECT * FROM users WHERE username=?', username);
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.TOKENAI_BROWSER_PATH ? { executablePath: process.env.TOKENAI_BROWSER_PATH } : {}) });
  const context = await browser.newContext();
  if (process.env.TOKENAI_SMOKE_SOURCE === '1') await context.route('https://seanzhang9999.github.io/webhome/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (!['awiki-coffee-trusted-space-v55-cfo.html', 'tokenai-expense.js', 'tokenai-markdown.js', 'tokenai-markdown.css'].includes(name)) return route.abort();
    await route.fulfill({ status: 200, contentType: name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html', body: await readFile(new URL('../../' + name, import.meta.url)) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  if (new URL(pageUrl).hostname === 'seanzhang9999.github.io') {
    await page.locator('[data-worktab=solutions]').click();
    await page.locator('[data-object="pack:expense-control"]').click();
    await page.locator('main [data-object="matter:expense"]').click();
  }
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-expense-action=login]').click();
  const popup = await popupPromise;
  await popup.locator('[name=username]').fill(username);
  await popup.locator('[name=password]').fill(password);
  await popup.getByRole('button', { name: '登录并连接事项' }).click();
  await page.locator('#expense-root .pill').filter({ hasText: '已登录 · 上线验收财务' }).waitFor({ timeout: 15000 });
  await page.locator('#expense-root [name=text]').fill(checkMcp ? '这是只读接入验收。请务必调用 tokenx_scenario_list 查询实际可用场景；成功后只回复“TokenX 场景查询已完成”。不要发起审核、上传、取消或分享。' : '这是上线验收。请只回复“TokenAI 上线对话已就绪”。不要调用业务工具。');
  await page.locator('[data-expense-form=message] button[type=submit]').click();
  await page.locator('.msg').filter({ has: page.locator('.avatar.agent') }).filter({ hasNot: page.getByText('正在回复', { exact: true }) }).locator('.bubble').filter({ hasText: checkMcp ? /TokenX 场景查询已完成/ : /^TokenAI 上线对话已就绪[。！]?$/ }).waitFor({ timeout: 90000 });
  const matters = store.all('SELECT * FROM matters WHERE tenant=?', user.tenant);
  assert.equal(matters.length, 1);
  const matter = matters[0];
  assert.equal(store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', matter.id).n, 2);
  await page.getByRole('textbox', { name: '向我的 AI 伙伴提问' }).fill('这次还没有具体审核结论，接下来应该先确认什么？');
  await page.locator('[data-companion-form=question] [type=submit]').click();
  await page.locator('#expense-companion .companion-answer .tokenai-markdown').waitFor({ timeout: 90000 });
  const privateQuestion = store.get("SELECT question,answer,status FROM companion_questions WHERE matter_id=? AND user_id=? ORDER BY rowid DESC LIMIT 1", matter.id, user.id);
  assert.equal(privateQuestion.status, 'completed'); assert.ok(privateQuestion.answer.length > 20);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', matter.id).n, 2);
  await page.getByRole('tab', { name: '自动分析', exact: true }).click();
  assert.equal(await page.locator('#expense-companion .companion-answer').count(), 0);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM operations WHERE matter_id=?', matter.id).n, 0);
  if (checkMcp) {
    const completed = store.all("SELECT data FROM events WHERE matter_id=? AND type='tool_completed'", matter.id).map(e => JSON.parse(e.data));
    assert.ok(completed.some(e => e.tool === 'tokenx_scenario_list' && !e.isError), 'Pi must actually complete the remote MCP read tool');
  }
  await page.locator('#expense-companion .companion-status').filter({ hasText: '建议已更新' }).waitFor({ timeout: 90000 });
  const privateAdvice = store.get('SELECT source_seq,text,status FROM companion_advice WHERE matter_id=? AND user_id=?', matter.id, user.id);
  assert.equal(privateAdvice.status, 'ready');
  assert.ok(privateAdvice.text.length > 20);
  assert.equal(privateAdvice.source_seq, store.get('SELECT MAX(seq) AS seq FROM messages WHERE matter_id=?', matter.id).seq);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', matter.id).n, 2);
  await page.waitForFunction(() => { const el = document.querySelector('#expense-scroll'); return el.scrollHeight - el.scrollTop - el.clientHeight < 4; });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ page: process.env.TOKENAI_SMOKE_SOURCE === '1' ? 'GitHub Pages origin with unpublished source override' : pageUrl, ingress: 'HTTPS Nginx -> dedicated systemd service', login: 'passed', model: 'DeepSeek via Pi', chat: 'passed', mcpScenarioList: checkMcp ? 'passed' : 'not requested', independentPrivateCompanion: 'passed', privateQuestionAnswer: 'passed', automaticAnalysisSeparate: true, latestMessageVisible: true, persistedMessages: 2, businessWrites: 0, browserErrors: 0 }));
  await context.close();
} finally {
  await browser?.close();
  // Do not delete the tenant while the real Agent can still append its result.
  const cleanupDeadline = Date.now() + 190000;
  while (store.get("SELECT COUNT(*) AS n FROM turns WHERE user_id=? AND status IN ('queued','running','stopping')", user.id).n && Date.now() < cleanupDeadline) await new Promise(resolve => setTimeout(resolve, 250));
  if (store.get("SELECT COUNT(*) AS n FROM turns WHERE user_id=? AND status IN ('queued','running','stopping')", user.id).n) throw new Error('Acceptance turn remains active; preserve this temporary tenant for exact-scope cleanup');
  for (const matter of store.all('SELECT id FROM matters WHERE tenant=?', user.tenant)) {
    for (const table of ['messages', 'events', 'turns', 'operations', 'runs', 'files', 'members']) store.run('DELETE FROM ' + table + ' WHERE matter_id=?', matter.id);
    store.run('DELETE FROM matters WHERE id=?', matter.id);
    await rm(join(stateDir, 'sessions', matter.id), { recursive: true, force: true });
    await rm(join(stateDir, 'workspaces', matter.id), { recursive: true, force: true });
  }
  store.run('DELETE FROM tokens WHERE user_id=?', user.id);
  store.run('DELETE FROM codes WHERE user_id=?', user.id);
  store.run('DELETE FROM users WHERE id=?', user.id);
  store.close();
}
