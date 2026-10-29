// Explicit check of the actual report buttons named by the user; no chat writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { SUBJECT_ID } from '../src/work-order-view.mjs';
const ids = (process.env.TOKENAI_REPORT_SUBJECT_IDS || '').split(',').filter(Boolean);
assert.ok(ids.length && ids.every(id => SUBJECT_ID.test(id)));
const credentials = JSON.parse(await readFile('/home/ecs-user/.config/tokenai-agent/bootstrap.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.TOKENAI_BROWSER_PATH });
const context = await browser.newContext(), page = await context.newPage(); let session;
const failures = [];
page.on('requestfailed', request => failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
try {
  await page.goto('https://seanzhang9999.github.io/webhome/awiki-coffee-trusted-space-v55-cfo.html');
  await page.locator('[data-worktab=solutions]').click(); await page.locator('[data-object="pack:expense-control"]').click(); await page.locator('main [data-object="matter:expense"]').click();
  const opening = page.waitForEvent('popup'); await page.locator('[data-expense-action=login]').click(); const popup = await opening;
  await popup.locator('[name=username]').fill(credentials.username); await popup.locator('[name=password]').fill(credentials.password); await popup.getByRole('button', { name: '登录并连接事项' }).click();
  await page.locator('#expense-root .pill').filter({ hasText: '已登录' }).waitFor();
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1')));
  for (const id of ids) {
    const saving = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('[data-expense-action=download-report][data-subject="' + id + '"]').first().click();
    const download = await saving; const markdown = await readFile(await download.path(), 'utf8'); assert.ok(markdown.includes(id));
    const manual = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('#expense-root footer').getByRole('link', { name: '保存文件', exact: true }).click();
    const manualDownload = await manual; assert.equal(await readFile(await manualDownload.path(), 'utf8'), markdown);
    console.log(JSON.stringify({ subjectPrefix: id.slice(0, 8), browserDownload: 'passed', directSaveFallback: 'passed', bytes: Buffer.byteLength(markdown) }));
  }
} catch (error) {
  const uiError = await page.locator('#expense-root .advance.error p').textContent({ timeout: 1000 }).catch(() => null);
  console.log(JSON.stringify({ uiError, failures })); throw error;
} finally {
  if (!session) session = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenai.session.v1'))).catch(() => null);
  if (session?.accessToken) await fetch('https://tokenai.awiki.info/api/v1/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + session.accessToken, 'Content-Type': 'application/json', Origin: 'https://tokenai.awiki.info' }, body: '{}' }).catch(() => {});
  await context.close(); await browser.close();
}
