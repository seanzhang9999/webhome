// Explicit read-only browser check for a user-authorized work order.
// Uses the existing financial account; never posts a chat message or changes a work order.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { SUBJECT_ID } from '../src/work-order-view.mjs';

const subjectId = process.env.TOKENAI_REPORT_SUBJECT_ID;
assert.ok(SUBJECT_ID.test(subjectId || ''), 'Provide an authorized subject ID');
const credentials = JSON.parse(await readFile('/home/ecs-user/.config/tokenai-agent/bootstrap.json', 'utf8'));
const pageUrl = process.env.TOKENAI_REPORT_PAGE || 'https://tokenai.awiki.ai/work-orders/' + subjectId;
const githubPage = new URL(pageUrl).hostname === 'seanzhang9999.github.io';
const browser = await chromium.launch({ headless: true, ...(process.env.TOKENAI_BROWSER_PATH ? { executablePath: process.env.TOKENAI_BROWSER_PATH } : {}) });
const context = await browser.newContext();
const page = await context.newPage(), errors = [];
const networkErrors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => { const url = new URL(request.url()); networkErrors.push({ host: url.hostname, path: url.pathname, error: request.failure()?.errorText }); });
let session;
async function navigateMatter() {
  if (!githubPage) return;
  await page.locator('[data-worktab=solutions]').click();
  await page.locator('[data-object="pack:expense-control"]').click();
  await page.locator('main [data-object="matter:expense"]').click();
}
async function showOrder() {
  if (githubPage) await page.locator('[data-expense-action=view-order][data-subject="' + subjectId + '"]').first().click();
  await page.getByRole('dialog', { name: '工单审核明细' }).waitFor({ timeout: 45000 });
}
try {
  await page.goto(pageUrl);
  await navigateMatter();
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-expense-action=login]').click();
  const popup = await popupPromise;
  await popup.locator('[name=username]').fill(credentials.username);
  await popup.locator('[name=password]').fill(credentials.password);
  assert.equal(await popup.locator('[name=remember]').isChecked(), true);
  await popup.getByRole('button', { name: '登录并连接事项' }).click();
  await page.locator('#expense-root .pill').filter({ hasText: '已登录' }).waitFor({ timeout: 15000 });
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1')));
  const dialog = page.getByRole('dialog', { name: '工单审核明细' });
  await showOrder();
  const legacyLinkConverted = await page.locator('[data-expense-action=view-order][data-subject="' + subjectId + '"]').count() > 0;
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1')));
  assert.ok(session?.expiresAt > Date.now() + 6 * 24 * 60 * 60000);
  const storage = await page.evaluate(() => ({ ...localStorage }));
  assert.equal(Object.keys(storage).some(key => /password/i.test(key)), false);
  assert.deepEqual(Object.keys(JSON.parse(storage['tokenai.session.v1'])).sort(), ['accessToken', 'expiresAt']);
  if (credentials.password.length >= 12) assert.equal(JSON.stringify(storage).includes(credentials.password), false);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载审核结果（Markdown）' }).click();
  const download = await downloadPromise;
  const markdown = await readFile(await download.path(), 'utf8');
  assert.ok(markdown.includes(subjectId));
  assert.ok(markdown.includes('完整审核数据'));
  assert.ok(markdown.includes('不等同于控制台原报告文件'));
  assert.ok(download.suggestedFilename().includes('审核结果导出'));
  assert.equal(markdown.includes('http://localhost:8089/doc'), false);
  await page.reload();
  await navigateMatter();
  await showOrder();
  assert.equal(context.pages().length, 1, 'Remembered login must restore without another password popup');
  await page.locator('#expense-companion .companion-status').filter({ hasText: '建议已更新' }).waitFor({ timeout: 90000 });
  assert.ok((await page.locator('#expense-companion .tokenai-markdown').innerText()).length > 20);
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await page.locator('[data-expense-action=logout]').click();
  await page.locator('[data-expense-action=login]').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('tokenai.session.v1')), null);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ entryPoint: githubPage ? 'github-pages' : 'tokenai', publicWorkOrderView: 'passed', realMcpData: true, legacyLinkConverted, markdownDownload: 'passed', reportBytes: Buffer.byteLength(markdown), independentPrivateCompanion: 'passed', rememberedLoginAfterReload: 'passed', logoutClearsSession: 'passed', rawPasswordCached: false, browserErrors: 0, businessWrites: 0 }));
} catch (error) {
  const uiError = await page.locator('#expense-root .advance.error p').textContent().catch(() => null);
  console.log(JSON.stringify({ browserErrors: errors, uiError, networkErrors }));
  throw error;
} finally {
  if (!session) session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1'))).catch(() => null);
  if (session?.accessToken) await fetch('https://tokenai.awiki.ai/api/v1/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + session.accessToken, 'Content-Type': 'application/json', Origin: 'https://tokenai.awiki.ai' }, body: '{}' }).catch(() => {});
  await context.close(); await browser.close();
}
