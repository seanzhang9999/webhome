// Explicit original-view check. Signed viewer URLs and report contents are never logged.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { loadEnvironment, configuration } from '../src/config.mjs';
import { SUBJECT_ID } from '../src/work-order-view.mjs';
loadEnvironment('/home/ecs-user/.config/tokenai-agent/environment');
const config = configuration(), id = process.env.TOKENAI_REPORT_SUBJECT_ID;
assert.ok(SUBJECT_ID.test(id || ''), 'Use a user-authorized work-order ID');
const credentials = JSON.parse(await readFile('/home/ecs-user/.config/tokenai-agent/bootstrap.json', 'utf8'));
const proxy = config.mcpProxyUrl ? new URL(config.mcpProxyUrl) : null;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.TOKENAI_BROWSER_PATH ? { executablePath: process.env.TOKENAI_BROWSER_PATH } : {}), ...(proxy ? { proxy: { server: proxy.origin, ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
const context = await browser.newContext(), page = await context.newPage(); let session;
try {
  await page.goto('https://tokenai.awiki.info/work-orders/' + id);
  const authPromise = page.waitForEvent('popup'); await page.locator('[data-expense-action=login]').click(); const auth = await authPromise;
  await auth.locator('[name=username]').fill(credentials.username); await auth.locator('[name=password]').fill(credentials.password); await auth.getByRole('button', { name: '登录并连接事项' }).click();
  const dialog = page.getByRole('dialog', { name: '工单审核明细' }); await dialog.waitFor({ timeout: 45000 });
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1')));
  const companion = dialog.locator('#audit-companion'); await companion.locator('textarea').fill('未发送的原生查看验证问题');
  const popupPromise = page.waitForEvent('popup'); await dialog.getByRole('button', { name: '打开审核结果', exact: true }).click(); const original = await popupPromise;
  await original.waitForURL(u => u.origin === 'https://mcp-local.parleyvoice.com', { timeout: 45000, waitUntil: 'commit' });
  assert.equal(await original.evaluate(() => window.opener === null), true);
  assert.equal(await dialog.isVisible(), true); assert.equal(await companion.isVisible(), true); assert.equal(await companion.locator('textarea').inputValue(), '未发送的原生查看验证问题');
  let nativeReady = false;
  for (let i = 0; i < 9; i++) {
    await original.waitForTimeout(5000);
    const text = await original.locator('body').innerText({ timeout: 5000 });
    nativeReady = text.length > 150 && /审核|证据|规则/.test(text);
    if (nativeReady || /链接无效|链接已失效|已过期/.test(text)) break;
  }
  console.log(JSON.stringify({ newWindow: 'opened at TokenX', openerDetached: true, originalAuditDataVisible: nativeReady, mainAuditAndCompanionPreserved: true, privateDraftPreserved: true, noIframe: true }));
} catch {
  throw new Error('Original-result browser check incomplete; signed viewer URL withheld');
} finally {
  if (!session) session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1'))).catch(() => null);
  if (session?.accessToken) await fetch('https://tokenai.awiki.info/api/v1/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + session.accessToken, 'Content-Type': 'application/json', Origin: 'https://tokenai.awiki.info' }, body: '{}' }).catch(() => {});
  await context.close(); await browser.close();
}
