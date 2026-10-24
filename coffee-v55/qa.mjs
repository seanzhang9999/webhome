import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
const base='http://127.0.0.1:8765/awiki-coffee-import-v55.html';
const get=()=>page.evaluate(()=>({cursor:s.cursor,gate:E[s.cursor].gate,role:currentRole,view,tab:workTab,group:E[s.cursor].g,board:s.boards[E[s.cursor].gate]||null}));
async function role(k){await page.locator('#v5role').selectOption(k);}
async function clickAction(name){const el=page.locator('[data-action="'+name+'"]').first();await el.waitFor({state:'visible',timeout:10000});await el.click();}
async function backToMatter(){const b=page.locator('[data-action="boardreturn"]').first();if(await b.count()){await b.click();}else await clickAction('current');}
await page.goto(base,{waitUntil:'domcontentloaded'});
assert.match(await page.title(),/咖啡/);
assert.equal((await get()).cursor,0);
assert.match(await page.locator('body').innerText(),/采购委托与跨时区撮合/);
console.log('PASS: 3 matters, pack-space-work shell and first event rendered');
await page.keyboard.press('n');
assert.equal((await get()).cursor,1);
await page.keyboard.press('n');
assert.equal((await get()).cursor,1,'cannot skip gate');
await clickAction('openboard:spec');
assert.match(await page.locator('body').innerText(),/M01/);
const radios=page.locator('input[name="board-choice"][value="hold"]');
await radios.first().check();
await clickAction('boardack:spec:customer');
assert.equal((await page.evaluate(()=>s.boards.spec.choice)),'hold');
await backToMatter();await page.keyboard.press('n');
assert.equal((await get()).cursor,1,'confirmed HOLD cannot unblock next event');
await clickAction('openboard:spec');
await clickAction('coffee-reopen:spec');
assert.equal((await page.evaluate(()=>s.boards.spec.version)),2);
await page.locator('input[name="board-choice"][value="approve"]').first().check();
await clickAction('boardack:spec:customer');
assert.equal((await page.evaluate(()=>s.boards.spec.choice)),'approve');
await backToMatter();
await page.keyboard.press('n');
assert.equal((await get()).cursor,2);
console.log('PASS: hold blocking, reopen version, and approve');
await page.screenshot({path:'coffee-v55-screen-1440.png',fullPage:true});
let safety=0;
while((await get()).cursor<38){
  if(++safety>100)throw new Error('exceeded flow loop');
  const st=await get();
  if(st.gate&&!(st.board?.status==='confirmed'&&st.board?.choice==='approve')){
    const key=st.gate;
    // Custom governance step before the customs handoff.
    if(key==='experiment-handoff'){
      await clickAction('v5-space-governance');await role('client');await clickAction('v5-vote:client');await role('research');await clickAction('v5-vote:research');
      await role('lab');await clickAction('v5-install:lab');await clickAction('v5-join:lab');await role('client');await page.evaluate(()=>goCurrent());
    }
    await clickAction('openboard:'+key);
    await page.locator('input[name="board-choice"][value="approve"]').first().check();
    const acks=await page.evaluate(k=>BOARD_META[k].approvers.map(([who])=>({who,role:roleForSigner(who)})),key);
    for(const a of acks){
      await role(a.role);
      await clickAction('boardack:'+key+':'+a.who);
    }
    assert.equal((await page.evaluate(k=>s.boards[k].choice,key)),'approve','Board '+key+' approved');
    await backToMatter();
  }
  const pos=(await get()).cursor;
  if(![0,1,2].includes((await get()).group))throw new Error('unexpected group');
  // Move with an authorized person; the visible role picker is part of this test.
  await role('client');
  await clickAction('next');
  const after=(await get()).cursor;
  if(after===pos)throw new Error('Failed to advance at event '+(pos+1)+'; gate '+(await get()).gate);
}
assert.equal((await get()).cursor,38);
const decisions=await page.evaluate(()=>Object.values(s.boards).filter(b=>b.status==='confirmed'&&b.choice==='approve').length);
assert.equal(decisions,7);
assert.equal((await page.evaluate(()=>s.created.length)),3);
console.log('PASS: 39 events, 7 Boards, 3 dynamic matter groups');
await role('client');
await page.evaluate(()=>goCurrent());
await page.locator('#privateInput').fill('QA_PRIVATE_LIN');
await page.locator('#privateForm button[type="submit"]').click();
await role('research');
assert.equal((await page.locator('body').innerText()).includes('QA_PRIVATE_LIN'),false,'private AI partner notes must be role-isolated');
console.log('PASS: private notes isolated by person');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'coffee-v55-screen-mobile.png',fullPage:true});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
assert.equal(overflow,false,'no page-wide horizontal overflow');
assert.deepEqual(errors,[],'browser console and page errors');
console.log('PASS: mobile viewport, no script errors');
await browser.close();
fs.writeFileSync('coffee-v55-qa-result.json',JSON.stringify({passed:true,events:39,boards:7,matters:3,errors},null,2));
