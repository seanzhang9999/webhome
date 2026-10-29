import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { nativeTicket, isNativeConsole, isNativeReport, NATIVE_ORIGIN } from '../src/native-view.mjs';
import { configuration } from '../src/config.mjs';
import { TokenX } from '../src/tokenx.mjs';
import { publicWorkOrder } from '../src/work-order-view.mjs';
import { Store, uid } from '../src/store.mjs';
import { addUser, hash } from '../src/auth.mjs';
import { buildApp } from '../src/app.mjs';
const subject = '11111111-1111-4111-8111-111111111111';
const otherSubject = '22222222-2222-4222-8222-222222222222';
const ticketData = () => ({ subject_id: subject, share_url: NATIVE_ORIGIN + '/share/audit/' + 'fixture_ticket_'.repeat(3), share_one_time: true, share_expires_at: new Date(Date.now() + 30 * 60000).toISOString() });

test('native views accept only matching short-lived one-time links at the documented origin', () => {
  const data = ticketData(); assert.equal(nativeTicket(data, subject).url, data.share_url);
  const publicData = publicWorkOrder({ ...data, console_url: NATIVE_ORIGIN + '/doc?subjectId=' + subject }, 'https://tokenai.awiki.info');
  assert.equal(publicData.share_url, undefined); assert.equal(JSON.stringify(publicData).includes('fixture_ticket_'), false);
  assert.equal(nativeTicket({ ...data, share_expires_at: data.share_expires_at.slice(0, -1) }, subject).expiresAt, Date.parse(data.share_expires_at));
  assert.equal(isNativeConsole(NATIVE_ORIGIN + '/doc?subjectId=' + subject, subject), true);
  assert.equal(isNativeConsole(NATIVE_ORIGIN + '/doc?subjectId=' + otherSubject, subject), false);
  assert.equal(isNativeConsole(NATIVE_ORIGIN + '/doc?subjectId=' + subject + '&redirect=https://evil.test', subject), false);
  assert.equal(isNativeReport(NATIVE_ORIGIN + '/files/' + subject + '/file-preview?nonce=n&sign=s&mode=preview'), true);
  for (const patch of [
    { subject_id: otherSubject }, { share_one_time: false }, { share_expires_at: new Date(Date.now()-1000).toISOString() },
    { share_expires_at: new Date(Date.now()+2*60*60000).toISOString() },
    ...['https://evil.test/share/audit/'+ 'a'.repeat(30), 'http://mcp-local.parleyvoice.com/share/audit/'+ 'a'.repeat(30), NATIVE_ORIGIN+'/mcp', NATIVE_ORIGIN+'/share/audit/'+ 'a'.repeat(30)+'?target=x', 'https://user:pass@mcp-local.parleyvoice.com/share/audit/'+ 'a'.repeat(30), NATIVE_ORIGIN+'/share/audit/'+ 'a'.repeat(30)+'#x'].map(share_url=>({share_url}))
  ]) assert.throws(()=>nativeTicket({...data,...patch},subject));
});

test('the explicit original-view action does not enable sharing or writes for the Agent', async () => {
  const config=configuration({TOKENX_WORK_ORDER_TENANT:'owner'}), tokenx=new TokenX(config);let calls=0;
  tokenx.connect=async()=>{};tokenx.validators.set('scenario_work_order',()=>true);
  tokenx.client={callTool:async req=>{calls++;assert.deepEqual(req,{name:'scenario_work_order',arguments:{subject_id:subject,include_detail:false,include_share:true}});return{structuredContent:ticketData(),content:[]};},close:async()=>{}};
  try {assert.equal(tokenx.allowed('scenario_share_link','owner'),false);assert.equal(tokenx.allowed('finance_contract_payment','owner'),false);assert.equal((await tokenx.nativeView(subject)).subjectId,subject);await assert.rejects(tokenx.call('scenario_work_order',{subject_id:subject,include_share:true}),/分享/);assert.equal(calls,1);}finally{await tokenx.close();}
});

test('native viewer API checks identity and organization, deduplicates clicks, and never posts links to chat', async () => {
  const dir=mkdtempSync(join(tmpdir(),'tokenai-native-')),config={...configuration({TOKENAI_STATE_DIR:dir}),workOrderTenant:'owner'},store=new Store(dir);
  for(const tenant of ['owner','outsider'])addUser(store,{username:tenant,name:tenant,tenant,password:'fixture-password-123'});
  const owner=store.get('SELECT * FROM users WHERE username=?','owner'),outsider=store.get('SELECT * FROM users WHERE username=?','outsider');
  for(const [token,user]of [['a'.repeat(43),owner],['b'.repeat(43),outsider]])store.run('INSERT INTO tokens VALUES(?,?,?)',hash(token),user.id,Date.now()+60000);
  let nativeCalls=0,readCalls=0;
  const tokenx={status:{},tools:[],close:async()=>{},call:async(name,args)=>{readCalls++;assert.equal(name,'scenario_work_order');assert.equal(args.include_share,false);return{content:[{type:'text',text:JSON.stringify({subject_id:args.subject_id,console_url:NATIVE_ORIGIN+'/doc?subjectId='+args.subject_id})}]};},nativeView:async id=>{nativeCalls++;return nativeTicket({...ticketData(),subject_id:id},id);}};
  const app=await buildApp(config,{store,tokenx,agent:{active:new Map(),close:async()=>{}},companion:{close:async()=>{}}});
  const url='/api/v1/work-orders/'+subject+'/native-view',headers={authorization:'Bearer '+'a'.repeat(43),origin:'https://seanzhang9999.github.io'},payload={requestId:uid(),url:'http://127.0.0.1/private'};
  try{
    assert.equal((await app.inject({method:'POST',url,payload})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url,payload,headers:{authorization:'Bearer '+'b'.repeat(43)}})).statusCode,403);
    assert.equal((await app.inject({method:'POST',url,payload:{requestId:'short'},headers})).statusCode,400);
    const [first,second]=await Promise.all([app.inject({method:'POST',url,headers,payload}),app.inject({method:'POST',url,headers,payload})]);assert.equal(first.statusCode,200);assert.equal(second.json().url,first.json().url);assert.equal(nativeCalls,1);assert.equal(readCalls,1);
    assert.equal((await app.inject({method:'POST',url:'/api/v1/work-orders/'+otherSubject+'/native-view',headers,payload})).statusCode,409);
    assert.equal(first.headers['cache-control'],'no-store');assert.equal(store.get('SELECT COUNT(*) AS n FROM messages').n,0);assert.equal(store.get('SELECT COUNT(*) AS n FROM operations').n,0);
    store.run('UPDATE users SET disabled=1 WHERE id=?',owner.id);assert.equal((await app.inject({method:'POST',url,headers,payload})).statusCode,401);assert.equal(nativeCalls,1);
  }finally{await app.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
