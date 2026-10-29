import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store, uid, now } from '../src/store.mjs';
import { addUser, hash } from '../src/auth.mjs';
import { configuration } from '../src/config.mjs';
import { FinanceCompanion } from '../src/companion.mjs';
import { buildApp } from '../src/app.mjs';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'tokenai-companion-')), config = configuration({ TOKENAI_STATE_DIR: dir }), store = new Store(dir);
  for (const [username, tenant] of [['manager-a','company-a'], ['manager-b','company-a'], ['outsider','company-b']]) addUser(store, { username, name: username, tenant, password: 'fixture-password-123' });
  const users = store.all('SELECT * FROM users ORDER BY username'), a = users.find(u => u.username === 'manager-a'), b = users.find(u => u.username === 'manager-b'), outsider = users.find(u => u.username === 'outsider');
  const matter = store.ensureMatter(a); store.ensureMatter(b); store.ensureMatter(outsider);
  return { dir, config, store, a, b, outsider, matter, cleanup() { store.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('companion follows new main-chat results and caches unchanged advice without posting shared messages', async () => {
  const f = fixture(); let calls = 0;
  const companion = new FinanceCompanion(f.config, f.store, { generate: async ({ sourceSeq, messages }) => { calls++; assert.ok(messages.length); return '## 建议\n\n基于消息 ' + sourceSeq; } });
  try {
    assert.equal(companion.request(f.matter, f.a).status, 'idle'); assert.equal(calls, 0);
    f.store.message(f.matter.id, null, f.a.id, f.a.name, '查询付款审核');
    f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '审核发现缺少验收附件');
    assert.equal(companion.request(f.matter, f.a).status, 'generating');
    await companion.settled(); const first = companion.request(f.matter, f.a);
    assert.equal(first.status, 'ready'); assert.equal(calls, 1);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages WHERE matter_id=?', f.matter.id).n, 2);
    f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '已补充新的审核结果');
    companion.request(f.matter, f.a); await companion.settled();
    assert.ok(companion.result(f.matter, f.a).sourceSeq > first.sourceSeq); assert.equal(calls, 2);
    companion.request(f.matter, f.a, true); await companion.settled(); assert.equal(calls, 3);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM operations').n, 0);
  } finally { await companion.close(); f.cleanup(); }
});

test('companion waits for main reply and keeps private advice separate even for members of one matter', async () => {
  const f = fixture(); let calls = 0;
  const companion = new FinanceCompanion(f.config, f.store, { generate: async ({ user }) => { calls++; return 'private-for-' + user.id; } });
  const turnId = uid(); f.store.message(f.matter.id, turnId, f.a.id, f.a.name, '主聊天正在处理');
  f.store.run('INSERT INTO turns VALUES(?,?,?,?,?,?,?)', turnId, f.matter.id, f.a.id, uid(), '处理中', 'running', now());
  const app = await buildApp(f.config, { store: f.store, companion, agent: { active: new Map(), close: async () => {} }, tokenx: { status: {}, tools: [], close: async () => {} } });
  const tokens = new Map();
  for (const [index, user] of [f.a, f.b, f.outsider].entries()) { const token = String.fromCharCode(65 + index).repeat(43); tokens.set(user.id, token); f.store.run('INSERT INTO tokens VALUES(?,?,?)', hash(token), user.id, Date.now() + 60000); }
  try {
    assert.equal(companion.request(f.matter, f.a).status, 'waiting'); assert.equal(calls, 0);
    f.store.run("UPDATE turns SET status='completed' WHERE id=?", turnId);
    companion.request(f.matter, f.a); companion.request(f.matter, f.b); await companion.settled();
    assert.notEqual(companion.result(f.matter, f.a).text, companion.result(f.matter, f.b).text);
    const url = '/api/v1/matters/' + f.matter.id + '/companion';
    assert.equal((await app.inject(url)).statusCode, 401);
    assert.equal((await app.inject({ url, headers: { authorization: 'Bearer ' + tokens.get(f.outsider.id) } })).statusCode, 404);
    const own = await app.inject({ url: url + '?user_id=' + f.b.id, headers: { authorization: 'Bearer ' + tokens.get(f.a.id) } });
    assert.equal(own.json().text, 'private-for-' + f.a.id);
    const questionUrl = url + '/questions';
    const payload = { question: '这次应先补什么材料？', clientMessageId: uid(), user_id: f.b.id };
    const posted = await app.inject({ method: 'POST', url: questionUrl, headers: { authorization: 'Bearer ' + tokens.get(f.a.id) }, payload });
    const duplicate = await app.inject({ method: 'POST', url: questionUrl, headers: { authorization: 'Bearer ' + tokens.get(f.a.id) }, payload });
    assert.equal(posted.statusCode, 202); assert.equal(posted.json().id, duplicate.json().id);
    await companion.settled();
    const privateQuestions = await app.inject({ url: questionUrl + '?user_id=' + f.b.id, headers: { authorization: 'Bearer ' + tokens.get(f.a.id) } });
    assert.equal(privateQuestions.json().questions.length, 1); assert.equal(privateQuestions.json().questions[0].answer, 'private-for-' + f.a.id);
    assert.equal((await app.inject({ url: questionUrl, headers: { authorization: 'Bearer ' + tokens.get(f.b.id) } })).json().questions.length, 0);
    assert.equal((await app.inject({ url: questionUrl, headers: { authorization: 'Bearer ' + tokens.get(f.outsider.id) } })).statusCode, 404);
    assert.equal((await app.inject(questionUrl)).statusCode, 401);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages').n, 1);
  } finally { await app.close(); f.cleanup(); }
});

test('private questions use their own history and never replace the automatic analysis', async () => {
  const f = fixture(), seen = [];
  const companion = new FinanceCompanion(f.config, f.store, { generate: async context => { seen.push(context); return context.mode === 'question' ? '回答：' + context.question : '自动分析：先核对验收证明'; } });
  try {
    f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '审核发现缺少验收证明');
    companion.request(f.matter, f.a); await companion.settled(); const automatic = companion.result(f.matter, f.a).text;
    companion.ask(f.matter, f.a, { question: '验收证明需要什么？', clientMessageId: uid() }); await companion.settled();
    companion.ask(f.matter, f.a, { question: '那下一步呢？', clientMessageId: uid() }); await companion.settled();
    const latest = seen.at(-1); assert.equal(latest.mode, 'question'); assert.equal(latest.history.length, 1);
    assert.equal(latest.history[0].question, '验收证明需要什么？'); assert.equal(latest.automaticAnalysis, automatic);
    assert.equal(companion.result(f.matter, f.a).text, automatic);
    assert.equal(companion.questions(f.matter, f.a).length, 2); assert.equal(companion.questions(f.matter, f.b).length, 0);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages').n, 1); assert.equal(f.store.get('SELECT COUNT(*) AS n FROM operations').n, 0);
  } finally { await companion.close(); f.cleanup(); }
});

test('new messages are picked up after an active analysis and errors do not cause endless automatic retries', async () => {
  const f = fixture(); let release, calls = 0, fail = false;
  const companion = new FinanceCompanion({ ...f.config, deepseekKey: 'fixture-private-key' }, f.store, { generate: async ({ sourceSeq }) => {
    calls++; if (calls === 1) return new Promise(resolve => { release = resolve; });
    if (fail) throw new Error('provider error fixture-private-key'); return 'advice-' + sourceSeq;
  } });
  try {
    const first = f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '第一版结果');
    companion.request(f.matter, f.a); await Promise.resolve();
    const latest = f.store.message(f.matter.id, null, 'tokenai', 'TokenAI', '第二版结果');
    assert.equal(companion.request(f.matter, f.a).status, 'generating');
    release('first advice'); await companion.settled(); assert.equal(companion.result(f.matter, f.a).sourceSeq, first.seq);
    companion.request(f.matter, f.a); await companion.settled(); assert.equal(companion.result(f.matter, f.a).sourceSeq, latest.seq);
    fail = true; companion.request(f.matter, f.a, true); await companion.settled();
    const failed = companion.request(f.matter, f.a); assert.equal(failed.status, 'error'); assert.equal(failed.error.includes('fixture-private-key'), false);
    const before = calls; companion.request(f.matter, f.a); await companion.settled(); assert.equal(calls, before);
  } finally { await companion.close(); f.cleanup(); }
});

test('audit questions use authorized server evidence and isolate work-order history', async () => {
  const f = fixture(); f.config.workOrderTenant = 'company-a';
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  const seen = [], calls = [];
  const companion = new FinanceCompanion(f.config, f.store, { generate: async context => { seen.push(context); return '回答：' + (context.workOrder?.subjectId || '主聊天'); } });
  const tokenx = { status: {}, tools: [], close: async () => {}, call: async (name, args) => {
    calls.push({ name, args }); if (![a,b].includes(args.subject_id)) throw new Error('missing');
    return { content: [{ type: 'text', text: JSON.stringify({ subject_id: args.subject_id, title: '服务端工单', audit_summary: '服务端确认的证据摘要', rule_results: { EXP01: { name: '核对附件', status: 'warning', evidence: [{ ref_id: 18, text: '材料待补充' }] } } }) }] };
  } };
  const app = await buildApp(f.config, { store: f.store, companion, tokenx, agent: { active: new Map(), close: async () => {} } });
  const tokens = new Map(); for (const [i,user] of [f.a,f.b,f.outsider].entries()) { const token = String.fromCharCode(65+i).repeat(43); tokens.set(user.id,token); f.store.run('INSERT INTO tokens VALUES(?,?,?)',hash(token),user.id,Date.now()+60000); }
  const url='/api/v1/matters/'+f.matter.id+'/companion/questions', headers={authorization:'Bearer '+tokens.get(f.a.id)};
  try {
    f.store.message(f.matter.id,null,'tokenai','TokenAI','主聊天记录');
    const payload={question:'为什么需要补材料？',clientMessageId:uid(),subjectId:a,workOrder:{summary:'伪造浏览器结论'},user_id:f.b.id};
    const response=await app.inject({method:'POST',url,headers,payload});assert.equal(response.statusCode,202);
    const duplicate=await app.inject({method:'POST',url,headers,payload});assert.equal(duplicate.json().id,response.json().id);
    await companion.settled();assert.equal(calls.length,1);assert.equal(seen.length,1);assert.equal(calls[0].name,'scenario_work_order');assert.equal(calls[0].args.include_share,false);
    assert.equal(seen[0].workOrder.summary,'服务端确认的证据摘要');assert.equal(seen[0].workOrder.subjectId,a);assert.ok(seen[0].workOrder.rules[0].evidence.includes('材料待补充'));assert.equal(JSON.stringify(seen[0]).includes('伪造浏览器结论'),false);
    assert.equal((await app.inject({method:'POST',url,headers,payload:{...payload,subjectId:b}})).statusCode,409);
    companion.ask(f.matter,f.a,{question:'另一工单',clientMessageId:uid(),subjectId:b});await companion.settled();assert.equal(seen.at(-1).history.length,0);
    companion.ask(f.matter,f.a,{question:'继续问这张单',clientMessageId:uid(),subjectId:a});await companion.settled();assert.equal(seen.at(-1).history.length,1);
    companion.ask(f.matter,f.a,{question:'只问主聊天',clientMessageId:uid()});await companion.settled();assert.equal(seen.at(-1).workOrder,null);assert.equal(seen.at(-1).history.length,0);
    const own=await app.inject({url:url+'?subjectId='+a,headers});assert.equal(own.json().questions.length,2);assert.ok(own.json().questions.every(q=>q.subject_id===a));assert.equal(own.json().questions[0].work_order_title,'服务端工单');
    const other=await app.inject({url:url+'?subjectId='+a,headers:{authorization:'Bearer '+tokens.get(f.b.id)}});assert.equal(other.json().questions.length,0);
    const outsiderMatter=f.store.ensureMatter(f.outsider);assert.equal((await app.inject({method:'POST',url:'/api/v1/matters/'+outsiderMatter.id+'/companion/questions',headers:{authorization:'Bearer '+tokens.get(f.outsider.id)},payload})).statusCode,403);
    assert.equal((await app.inject({url:url+'?subjectId='+a,headers:{authorization:'Bearer '+tokens.get(f.outsider.id)}})).statusCode,404);
    assert.equal((await app.inject({method:'POST',url,headers,payload:{...payload,clientMessageId:uid(),subjectId:[a]}})).statusCode,400);
    const before=seen.length;const failed=companion.ask(f.matter,f.a,{question:'失效工单',clientMessageId:uid(),subjectId:'33333333-3333-4333-8333-333333333333'});await companion.settled();assert.equal(f.store.get('SELECT status FROM companion_questions WHERE id=?',failed.id).status,'failed');assert.equal(seen.length,before);
    assert.equal(f.store.get('SELECT COUNT(*) AS n FROM messages').n,1);assert.equal(f.store.get('SELECT COUNT(*) AS n FROM operations').n,0);assert.equal(f.store.get('SELECT COUNT(*) AS n FROM companion_advice').n,0);
    const snapshot=companion.auditSnapshot({subject_id:a,rule_results:Array.from({length:200},()=>({summary:'长'.repeat(6000),evidence:'证据'.repeat(3000)}))});assert.equal(snapshot.truncated,true);assert.ok(snapshot.rules.length<=40);assert.ok(JSON.stringify(snapshot).length<30000);
    f.store.run('DELETE FROM companion_questions WHERE id=?',response.json().id);assert.equal(f.store.get('SELECT COUNT(*) AS n FROM companion_question_contexts WHERE question_id=?',response.json().id).n,0);
  } finally { await app.close(); f.cleanup(); }
});
