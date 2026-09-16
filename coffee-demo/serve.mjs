import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
http.createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
 const data=await readFile(path);res.setHeader('Content-Type',extname(path)==='.html'?'text/html; charset=utf-8':'text/plain; charset=utf-8');res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4178,'127.0.0.1',()=>console.log('Coffee demo: http://127.0.0.1:4178/awiki-coffee-import-demo.html'));
