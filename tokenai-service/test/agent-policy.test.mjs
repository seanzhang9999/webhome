import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { streamSimple } from '@earendil-works/pi-ai/api/openai-completions';
import { normalizeContext } from '@earendil-works/pi-ai';
import { financeModel, toolContextText, responseFailure, MODEL_OUTPUT_TOKENS } from '../src/agent-policy.mjs';

test('long-history requests retain answer budget and explicitly disable DeepSeek thinking', async () => {
  const requests=[];
  const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;requests.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({id:'fixture',choices:[{index:0,delta:{role:'assistant',content:'测试答复'},finish_reason:'stop'}],usage:{prompt_tokens:67000,completion_tokens:2,total_tokens:67002}})+'\n\ndata: [DONE]\n\n');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const model={...financeModel({model:'fixture-deepseek'}),provider:'tokenai-deepseek',api:'openai-completions',baseUrl:'http://127.0.0.1:'+server.address().port};
  const context=normalizeContext({systemPrompt:'测试上下文预算',messages:[{role:'assistant',content:[{type:'text',text:'此前对话摘要'}],api:model.api,provider:model.provider,model:model.id,usage:{input:67000,output:1,cacheRead:0,cacheWrite:0,totalTokens:67001,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'stop',timestamp:Date.now()-2000},{role:'user',content:[{type:'text',text:'继续查询当前工单'}],timestamp:Date.now()}]});
  try {
    await streamSimple({...model,reasoning:false,contextWindow:65536,maxTokens:4096},context,{apiKey:'fixture-key',reasoning:'off',maxRetries:0}).result();
    assert.equal(requests[0].max_tokens,1,'Reproduce the old silent one-token request');assert.equal(requests[0].thinking,undefined);
    const answer=await streamSimple(model,context,{apiKey:'fixture-key',reasoning:'off',maxRetries:0}).result();
    assert.equal(requests[1].max_tokens,MODEL_OUTPUT_TOKENS);assert.deepEqual(requests[1].thinking,{type:'disabled'});assert.equal(answer.stopReason,'stop');assert.equal(answer.content[0].text,'测试答复');
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('tool context removes duplicate MCP envelopes without dropping distinct information',()=>{
  const data={subject_id:'fixture',rules:[{code:'A1',evidence:'原始证据'}]};const text=JSON.stringify(data);
  assert.equal(toolContextText({content:[{type:'text',text}],structuredContent:{rules:data.rules,subject_id:data.subject_id}}),text);
  assert.equal(toolContextText({content:[{type:'text',text}]}),text);
  const different=JSON.parse(toolContextText({content:[{type:'text',text:'摘要'}],structuredContent:data}));assert.equal(different.text,'摘要');assert.deepEqual(different.structuredContent,data);
  const resource={content:[{type:'resource_link',uri:'https://example.test/evidence',name:'证据'}]};assert.deepEqual(JSON.parse(toolContextText(resource)),resource);
});

test('reply failures distinguish token limits, user stop, timeout, and compaction',()=>{
  assert.match(responseFailure({lastStop:'length',answer:''}),/长度限制/);
  assert.match(responseFailure({lastStop:'length',answer:'未完成的前置说明'}),/未生成完整答复/);
  assert.match(responseFailure({stopped:true,timedOut:true}),/已停止/);
  assert.match(responseFailure({timedOut:true}),/处理时限/);
  assert.match(responseFailure({lastStop:'aborted'}),/中断/);
  assert.match(responseFailure({compactionError:'failed',answer:''}),/上下文整理/);
  assert.match(responseFailure({lastStop:'toolUse',answer:'我先查询一下'}),/最终答复/);
  assert.equal(responseFailure({lastStop:'stop',answer:'已完成答复',compactionError:'post-response housekeeping failed'}),null);
});
