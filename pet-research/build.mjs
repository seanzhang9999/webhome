import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const js=(await Promise.all(['data','engine','app'].map(n=>read(n+'.mjs')))).map(s=>s.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
new vm.Script('(()=>{'+js+'})();');
await writeFile(new URL('../awiki-pet-research-demo.html',import.meta.url),`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>材数智元 × AWiki · PET科研协同</title><style>${await read('theme.css')}</style></head><body><div id="root"></div><script>/* pet-research-release: 2026-10-12-v1 */(()=>{${js}})();</script></body></html>`);
console.log('Built standalone PET demo; coffee files untouched.');
