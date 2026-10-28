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
    if (!['awiki-coffee-trusted-space-v55-cfo.html', 'tokenai-expense.js'].includes(name)) return route.abort();
    await route.fulfill({ status: 200, contentType: name.endsWith('.js') ? 'application/javascript' : 'text/html', body: await readFile(new URL('../../' + name, import.meta.url)) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TOKENAI_SMOKE_SOURCE === '1' ? 'https://seanzhang9999.github.io/webhome/awiki-coffee-trusted-space-v55-cfo.html' : 'https://tokenai.awiki.ai', { waitUntil: 'domcontentloaded' });
  if (process.env.TOKENAI_SMOKE_SOURCE === '1') {
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
  await page.locator('#expense-root [name=text]').fill('这是上线验收。请只回复“TokenAI 上线对话已就绪”。不要调用业务工具。');
  await page.locator('[data-expense-form=message] button[type=submit]').click();
  await page.locator('.bubble').filter({ hasText: /^TokenAI 上线对话已就绪[。！]?$/ }).waitFor({ timeout: 90000 });
  const matters = store.all('SELECT * FROM matters WHERE tenant=?', user.tenant);
  assert.equal(matters.length, 1);
  const matter = matters[0];
  assert.equal(store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', matter.id).n, 2);
  assert.equal(store.get('SELECT COUNT(*) AS n FROM operations WHERE matter_id=?', matter.id).n, 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ page: process.env.TOKENAI_SMOKE_SOURCE === '1' ? 'GitHub Pages origin with unpublished source override' : 'TokenAI standalone', ingress: 'HTTPS Nginx -> dedicated systemd service', login: 'passed', model: 'DeepSeek via Pi', chat: 'passed', persistedMessages: 2, businessWrites: 0, browserErrors: 0 }));
  await context.close();
} finally {
  await browser?.close();
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
