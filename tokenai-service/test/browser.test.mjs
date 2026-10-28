import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/store.mjs';
import { addUser } from '../src/auth.mjs';
import { configuration } from '../src/config.mjs';
import { buildApp } from '../src/app.mjs';

test('existing page opens a persistent finance matter, authenticates and displays backend replies', { timeout: 45000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tokenai-browser-'));
  const config = configuration({ TOKENAI_STATE_DIR: dir });
  const store = new Store(dir);
  addUser(store, { username: 'browser-finance', name: '测试财务', tenant: 'browser-test', password: 'browser-fixture-password' });
  const finance = store.get('SELECT * FROM users WHERE username=?', 'browser-finance');
  const seededMatter = store.ensureMatter(finance);
  const historyCount = 35;
  for (let i = 0; i < historyCount; i++) store.message(seededMatter.id, null, 'tokenai', 'TokenAI 报销费控助手', '历史消息 ' + i + '\n' + '历史审核说明，仅用于界面回归。\n'.repeat(5));
  const tokenx = { status: { connected: true }, tools: [{ name: 'scenario_list' }], allowed: () => true, close: async () => {} };
  const agent = { active: new Map(), close: async () => {}, enqueue(matter, user, turn) {
    store.message(matter.id, turn.id, 'tokenai', 'TokenAI 报销费控助手', '浏览器接口验收回复：' + turn.text);
    store.run("UPDATE turns SET status='completed' WHERE id=?", turn.id);
    store.event(matter.id, turn.id, 'turn_completed', { turnId: turn.id });
  } };
  const app = await buildApp(config, { store, tokenx, agent });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = 'http://127.0.0.1:' + app.server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.TOKENAI_BROWSER_PATH ? { executablePath: process.env.TOKENAI_BROWSER_PATH } : {}) });
  const context = await browser.newContext();
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  try {
    await context.route('https://seanzhang9999.github.io/webhome/**', async route => {
      const url = new URL(route.request().url()), name = url.pathname.split('/').pop();
      if (!['awiki-coffee-trusted-space-v55-cfo.html', 'tokenai-expense.js'].includes(name)) return route.abort();
      const body = await readFile(new URL('../../' + name, import.meta.url));
      await route.fulfill({ status: 200, body, contentType: name.endsWith('.js') ? 'application/javascript' : 'text/html' });
    });
    await context.route('https://tokenai.awiki.ai/**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.endsWith('/events')) {
        const matterId = url.pathname.split('/')[4];
        const rows = store.all('SELECT * FROM events WHERE matter_id=? AND seq>? ORDER BY seq', matterId, Number(url.searchParams.get('after') || 0));
        return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': 'https://seanzhang9999.github.io' }, body: rows.map(e => 'event: ' + e.type + '\ndata: ' + JSON.stringify({ ...JSON.parse(e.data), seq: e.seq }) + '\n\n').join('') + ': heartbeat\n\n' });
      }
      const response = await context.request.fetch(address + url.pathname + url.search, { method: request.method(), headers: await request.allHeaders(), data: request.postDataBuffer() || undefined });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto('https://seanzhang9999.github.io/webhome/awiki-coffee-trusted-space-v55-cfo.html');
    await page.locator('[data-worktab=solutions]').click();
    await page.locator('[data-object="pack:expense-control"]').click();
    await page.getByRole('heading', { name: '报销费控协同方案', exact: true }).waitFor();
    await page.locator('main [data-object="matter:expense"]').click();
    await page.getByRole('heading', { name: '报销费控工作台', exact: true }).waitFor();
    const popupPromise = page.waitForEvent('popup');
    await page.locator('[data-expense-action=login]').click();
    const popup = await popupPromise;
    await popup.locator('[name=username]').fill('browser-finance');
    await popup.locator('[name=password]').fill('browser-fixture-password');
    await popup.getByRole('button', { name: '登录并连接事项' }).click();
    await page.locator('#expense-root .pill').filter({ hasText: '已登录 · 测试财务' }).waitFor();
    const firstMatterId = store.get('SELECT id FROM matters').id;
    await page.waitForFunction(() => { const el = document.querySelector('#expense-scroll'); return el.scrollHeight - el.scrollTop - el.clientHeight < 4; });
    await page.locator('#expense-scroll').evaluate(el => { el.scrollTop = 0; });
    await page.locator('#expense-root [name=text]').fill('查询当前可用场景');
    await page.locator('[data-expense-form=message] button[type=submit]').click();
    await page.locator('.bubble').filter({ hasText: '浏览器接口验收回复：查询当前可用场景' }).waitFor();
    await page.waitForFunction(() => { const el = document.querySelector('#expense-scroll'); return el.scrollHeight - el.scrollTop - el.clientHeight < 4; }, null, { timeout: 5000 });
    await page.locator('[data-worktab=solutions]').click();
    await page.locator('[data-object="pack:expense-control"]').click();
    await page.locator('main [data-object="matter:expense"]').click();
    await page.waitForFunction(() => { const el = document.querySelector('#expense-scroll'); return el.scrollHeight - el.scrollTop - el.clientHeight < 4; });
    // Switching back to the original pack preserves its deterministic flow.
    await page.locator('#expense-root [name=text]').fill('不应带入其他账号的草稿');
    await page.locator('[data-expense-action=logout]').click();
    await page.locator('[data-expense-action=login]').waitFor();
    assert.equal(await page.locator('#expense-root [name=text]').inputValue(), '');
    assert.equal(await page.locator('#expense-root .bubble').count(), 0);
    await page.locator('[data-worktab=solutions]').click();
    await page.locator('[data-object="pack:main"]').click();
    await page.getByRole('heading', { name: '巴西咖啡进口协同方案', exact: true }).waitFor();
    await page.locator('[data-worktab=matters]').click();
    await page.locator('[data-object="group:0"]').click();
    assert.equal(await page.locator('#group-form').count(), 1);
    await page.locator('[data-action=reset]').click();
    await page.locator('[data-action="reset:confirm"]').click();
    assert.equal(store.get('SELECT id FROM matters').id, firstMatterId);
    assert.equal(store.get('SELECT COUNT(*) AS n FROM messages').n, historyCount + 2);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); await app.close(); store.close(); await rm(dir, { recursive: true, force: true }); }
});
