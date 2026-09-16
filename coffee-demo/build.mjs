import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const original=await read('awiki-foreign-trade-demo.html');
const css=original.match(/<style>([\s\S]*?)<\/style>/)[1];
const modules=await Promise.all(['scenario','engine','app'].map(n=>read(`coffee-demo/${n}.mjs`)));
const js=modules.map(s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
new vm.Script(`(()=>{${js}\n})();`);
const extra=await read('coffee-demo/theme.css');
await writeFile(new URL('awiki-coffee-import-demo.html',root),`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="AWiki 厦门咖啡进口智能体网络协作示范：有边界的跨时区撮合、人机混合群谈判与进口履约。全部为虚构预设演示。"><title>AWiki · 厦门咖啡进口智能体网络 Demo</title><style>${css}\n${extra}</style></head><body><div id="root"></div><script>/* coffee-network-release: 2026-09-16-v1 */\n(()=>{${js}\n})();</script></body></html>`,'utf8');
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const md=await read('docs/plans/2026-09-16-coffee-network-design.md');
const prose=md.split('\n').map(l=>{const m=l.match(/^(#{1,3}) (.*)/);if(m)return `<h${m[1].length}>${esc(m[2])}</h${m[1].length}>`;if(!l.trim())return '';return `<p>${esc(l).replace(/https:\/\/[^\s。]+/g,u=>`<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`;}).join('\n');
await writeFile(new URL('awiki-coffee-import-design.html',root),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AWiki · 厦门咖啡进口协作方案与研究</title><style>body{margin:0;background:#eff3ee;color:#273c32;font:15px/1.9 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:880px;margin:40px auto;background:#fff;padding:45px 55px;border:1px solid #dbe3db;border-radius:15px}h1{font-size:29px}h2{font-size:22px;margin-top:35px;border-top:1px solid #e0e8df;padding-top:23px}h3{font-size:17px}a{color:#276856;overflow-wrap:anywhere}p{overflow-wrap:anywhere}nav{display:flex;gap:20px;font-size:13px}.label{color:#64816c;font-size:12px}@media(max-width:650px){main{margin:0;padding:25px}}</style></head><body><main><nav><a href="awiki-coffee-import-demo.html">← 打开交互演示</a><a href="awiki-foreign-trade-demo.html">原版外贸演示</a></nav><p class="label">研究、设计与执行计划 · 2026-09-16 · 全部案例数据虚构</p>${prose}</main></body></html>`,'utf8');
console.log('Built coffee demo and design pages. Original demo unchanged.');
