import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../awiki-coffee-import-demo.html',import.meta.url),'utf8');
test('published artifact has a valid self-contained script',()=>{
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.equal(/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|@import|url\(https?:/i.test(html),false);
 assert.equal(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(script),false);
});
test('published artifact includes every human gate and release marker',()=>{
 assert.ok(html.includes('coffee-network-release: 2026-09-16-v1'));
 for(const s of ['确认委托与夜间边界','继续核验与询样','批准进入正式洽谈','审阅v3并批准签约','模拟周敏确认预付款','模拟周敏确认尾款','确认本批报关委托'])assert.ok(html.includes(s));
 assert.ok(html.includes('if(e.repeat||e.ctrlKey'));
 assert.ok(html.includes('function restore(raw)'));
});
