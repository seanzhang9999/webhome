import test from 'node:test';
import assert from 'node:assert/strict';
import {events,groups,actors,docs} from './scenario.mjs';
import {initial,reduce,pending,restore} from './engine.mjs';
import {portuguese,partnerRecommendations} from './translations.mjs';
test('every Brazilian speaker has original and translation; every gate has a private recommendation',()=>{
 for(const e of events){
  if(['seller','sales'].includes(e.actor)){assert.ok(portuguese[e.id]?.original);assert.ok(portuguese[e.id]?.translation);}
  if(e.gate)assert.ok(partnerRecommendations[e.id]);
 }
 assert.equal(Object.keys(portuguese).length,3);
});
test('simulation never crosses a human decision gate',()=>{
 let s=initial();let approvals=0;
 for(let i=0;i<events.length;i++){
  assert.equal(s.cursor,i);
  if(pending(s)){
   assert.equal(reduce(s,'next'),s);
   s=reduce(s,'approve');approvals++;
   assert.equal(reduce(s,'approve'),s);
  }
  s=reduce(s,'next');
 }
 assert.equal(s.cursor,events.length-1);assert.equal(approvals,7);
 assert.deepEqual(restore(JSON.stringify(s)),s);
});
test('pause, revocation and reset are effective',()=>{
 let s=reduce(initial(),'next');s=reduce(s,'pause');
 assert.equal(reduce(s,'approve'),s);assert.equal(reduce(s,'next'),s);
 s=reduce(s,'resume');assert.equal(pending(s),true);
 s=reduce(s,'revoke');assert.equal(reduce(s,'resume'),s);assert.equal(reduce(s,'approve'),s);
 assert.deepEqual(reduce(s,'reset'),initial());
});
test('corrupt and skipped-gate saves cannot bypass authorization',()=>{
 for(const raw of ['bad','null',JSON.stringify({...initial(),cursor:20}),JSON.stringify({...initial(),cursor:-1}),JSON.stringify({...initial(),decisions:[0]}),JSON.stringify({...initial(),revoked:true})])assert.deepEqual(restore(raw),initial());
});
test('three groups are sequential and references resolve',()=>{
 let last=0;
 for(const e of events){assert.ok(actors[e.actor]);assert.ok(groups[e.group]);assert.ok(e.group>=last);last=e.group;if(e.doc)assert.ok(docs[e.doc]);}
 assert.equal(last,2);assert.equal(new Set(events.map(e=>e.id)).size,events.length);
 const signed=events.findIndex(e=>e.doc==='signed');const fulfill=events.findIndex(e=>e.group===2);
 assert.ok(signed<fulfill);assert.ok(events.slice(0,signed).some(e=>e.gate&&e.doc==='contract'));
});
