/* AWiki V5.5 IR Suite · Shared browser-only simulation state.
   A localStorage namespace lets separate GitHub Pages demo screens exchange a
   sample workflow. It is NOT secure tenancy, DID authentication, or an API. */
(function(){
"use strict";
const KEY="awiki.ir.suite.v2.20261017";
const VERSION="2.1";
const ISSUER="维港样例控股（虚构）";
const PROVIDER="Harbour IR Studio（虚构）";
const DOCS=[
{id:"IR-DEMO-AR25",title:"FY2025 经营概览（虚构）",sub:"收入 2024 HK$7.8bn / 2025 HK$8.4bn",stage:"public",version:"demo-1.0",origin:"发行人批准公开的示例资料",kind:"年报概览"},
{id:"IR-DEMO-1H26",title:"2026 年中期业务观察（虚构）",sub:"2026H1 收入 HK$4.6bn；仅作交互数据",stage:"public",version:"demo-0.9",origin:"发行人批准公开的示例资料",kind:"中期介绍"},
{id:"IR-DEMO-EVENT",title:"公开投资者资料交流会（虚构）",sub:"公开资料答疑和活动报名示意",stage:"public",version:"demo-1.0",origin:"发行人批准公开的示例资料",kind:"公开活动"}
];
const stamp=()=>new Date().toISOString();
function fresh(){
return {version:VERSION,created:stamp(),identity:{signed:false,did:"did:wba:investor.demo.invalid:user-001",handle:"@investor.awiki.demo",aura:"did:wba:agent.demo.invalid:aura-001",node:"did:wba:device.demo.invalid:browser-01"},
space:{id:"HKIR-SPACE-DEMO-001",pack:"awiki.hk-ir-public@0.1-demo",policyVersion:"P-IR-01",issuerJoined:true,providerJoined:true,creator:{providerVote:false,issuerVote:false,joined:false},events:[{at:stamp(),actor:"空间初始化（模拟）",text:"上市公司与 IR 运营方按 V5.5 方案配置受限合作空间；无真实 DID 签名。"}]},
inquiries:[],tasks:[],inbox:[],aura:{awake:false,events:[],lastContext:""},
creator:{id:"CREATOR-BOARD-001",title:"上市公司 × 财经创作者公开内容合作（演示）",status:"proposal",draft:"",approved:"",events:[{at:stamp(),actor:"IR 运营方",kind:"合作提案",text:"公司拟委托创作者解读已公开资料；必须显著披露商业合作，禁止冒充独立投资建议。"}]},
ui:{portalTab:"content",portalForm:"none",meTab:"overview",backTab:"space",role:"provider",selectedInquiry:"",chatTurns:[{role:"assistant",text:"这里是 ChatGPT 接入的交互模拟页，并非真实 ChatGPT。你可以让我读取同一智媒体公开 JSON、草拟问题、在确认后把委托发送到 AWiki 演示工作区。"}],chatConsent:false,followRoute:"awiki"},
seq:{inquiry:1001,task:201,notice:1,delegation:1}};
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return fresh();const o=JSON.parse(raw);if(o.version!==VERSION||!Array.isArray(o.inquiries)||!Array.isArray(o.tasks))return fresh();return o;}catch(e){return fresh();}}
let s=load();let channel=null;try{if("BroadcastChannel" in window){channel=new BroadcastChannel(KEY);channel.addEventListener("message",()=>sync())}}catch(e){}
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fmtTime(t){const d=new Date(t);return isNaN(d.getTime())?"演示":d.toLocaleString("zh-CN",{hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}
function notice(title,text,ref,category){s.inbox.unshift({id:"N-"+s.seq.notice++,title,text,ref:ref||"",category:category||"activity",time:stamp(),read:false});if(s.inbox.length>75)s.inbox.length=75;}
function logAura(type,text){s.aura.events.unshift({type,text,at:stamp()});s.aura.events=s.aura.events.slice(0,30);}
function toast(text){let node=document.getElementById("toast");if(!node){node=document.createElement("div");node.id="toast";node.className="toast";node.setAttribute("role","status");document.body.appendChild(node)}node.textContent=text;node.style.display="block";clearTimeout(toast._id);toast._id=setTimeout(()=>{node.style.display="none";},3200);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){toast("浏览器不允许保存本地演示状态。")}try{channel?.postMessage("sync")}catch(e){}if(typeof window.AW.render==="function")window.AW.render();}
function sync(){const next=load();if(JSON.stringify(next)!==JSON.stringify(s)){s=next;if(typeof window.AW.render==="function")window.AW.render();}}
window.addEventListener("storage",e=>{if(e.key===KEY)sync()});
async function copy(text){try{await navigator.clipboard.writeText(String(text));toast("已复制");}catch(e){const i=document.createElement("textarea");i.value=String(text);document.body.appendChild(i);i.select();const ok=document.execCommand("copy");i.remove();toast(ok?"已复制":"当前浏览器复制受限，请手动选择文本")}}
function signed(){if(!s.identity.signed){toast("请先在页面上模拟绑定 AWiki 用户身份");return false;}return true;}
function signin(){if(!s.identity.signed){s.identity.signed=true;logAura("identity","已模拟绑定 AWiki 用户 DID 与 AURA 身份；没有联系真实身份服务器。");notice("阿维身份已准备","浏览器演示身份可以保存私人任务、提交选定的 IR 请求。","","identity");save();toast("模拟身份已绑定")}else toast("当前已处于模拟登录状态")}
function wake(context){s.aura.awake=true;s.aura.lastContext=context||"IR 智媒体公开资料";logAura("context","受限分身已装载 "+s.aura.lastContext+"；未读取其他应用的聊天历史。");save();toast("阿维已在当前环境唤起（模拟）")}
function inquiry({text,source="IR-DEMO-AR25",origin="pr",kind="investor"}){
if(!signed())return null;
text=String(text||"").trim();
if(text.length<8){toast("请填写至少八个字的具体请求");return null;}
if(!DOCS.some(d=>d.id===source)){toast("请选择本演示的公开资料来源");return null;}
const id="IR-Q-"+s.seq.inquiry++;
const row={id,kind,issuer:"issuer-demo",provider:"provider-demo",origin,text,source,status:"submitted",createdAt:stamp(),updatedAt:stamp(),draft:"",response:"",audience:"private_to_requester",scope:["用户主动提交的问题","公开来源 "+source],events:[{at:stamp(),actor:"投资者个人阿维",kind:"提交经确认请求",text:"按照所选范围发送到模拟 IR 服务空间；不包含个人私人研究。"}]};
s.inquiries.unshift(row);
notice("IR 问询已提交（模拟）",id+"：已进入 IR 服务商受理队列。",id,"submitted");
logAura("delegation",id+" 发送到服务空间；等待受理。");save();
toast("模拟 IR 请求 "+id+" 已提交；后台可查看");
return id;
}
function creatorRequest(text,origin){if(!signed())return null;const safe=String(text||"").trim();if(safe.length<12){toast("请具体描述创作者合作需求");return null;}return inquiry({text:safe,source:"IR-DEMO-EVENT",kind:"creator",origin:origin||"pr"});}
function task({title,route="me",origin="pr",source="IR-DEMO-AR25"}){
if(!signed())return null;title=String(title||"").trim();if(title.length<5){toast("请填写至少五个字的跟踪目标");return null;}
const id="TASK-"+s.seq.task++;
const t={id,title,route,origin,source,status:"active",scope:"private",createdAt:stamp(),events:[{at:stamp(),actor:"用户",kind:"建立私人委托",text:"仅保存公开资料引用与本次目标，未发给 IR 服务商。"}]};
s.tasks.unshift(t);
notice("已建立私人工作",id+"："+title+"。可在 AWiki Me 一览继续。",id,"task");
logAura("task",id+" 已归入私人工作；指定继续界面："+(route==="chatgpt"?"ChatGPT 模拟":"AWiki Me"));
save();toast("已建立 "+id+"；AWiki Me 和接入模拟均可看到");return id;
}
function routeTask(id,route){if(!signed())return;let t=s.tasks.find(x=>x.id===id);if(!t){toast("找不到该任务");return;}if(!["chatgpt","me","local"].includes(route)){toast("不支持此委托路径");return;}t.route=route;t.events.push({at:stamp(),actor:"用户阿维",kind:"修改接续路径",text:"改为 "+route+"（模拟，不代表实际唤醒第三方 Agent）。"});notice("任务接续方式已更新",t.id+"：下次可以在 "+route+" 中主动读取；未自动触发外部 AI。",t.id,"routing");save();toast("已更新委托路由（模拟）")}
function draftInquiry(id){if(s.ui.role!=="provider"){toast("必须切换 IR 运营方角色起草");return;}const q=s.inquiries.find(x=>x.id===id);if(!q||!["submitted","revision"].includes(q.status)){toast("当前状态不可起草");return;}
q.status="drafted";q.updatedAt=stamp();q.draft=q.kind==="creator"?"我们已收到财经创作者合作意向。可研议围绕已公开信息开展品牌合作，并明确付费关系和推广标识；正式合作内容须由发行人及服务方审核，不能作个别投资建议。":"我们收到关于公开资料「"+(DOCS.find(x=>x.id===q.source)?.title||"演示资料")+"」的问询。请以发行人正式公开资料为依据核对；此示例中的全部公司财务信息均为虚构数据，不构成真实公司的解释或投资意见。";
q.events.push({at:stamp(),actor:"Harbour IR Studio（模拟）",kind:"准备审核草稿",text:"数字员工仅准备候选回复，并标记公开来源；正式发布权属于发行人。"});save();toast("服务商候选回复已生成，等待发行人审批")}
function approveInquiry(id){if(s.ui.role!=="issuer"){toast("只有发行人审批视角可作此演示动作");return;}const q=s.inquiries.find(x=>x.id===id);if(!q||q.status!=="drafted"){toast("仅待发行人审核的草稿可以批准");return;}
q.status="approved";q.updatedAt=stamp();q.response=q.draft+"【注意：这里仅是浏览器内的演示回复，未签署、未通过真实上市公司审阅，亦未对外发送。】";
q.events.push({at:stamp(),actor:"维港样例控股（模拟）",kind:"模拟批准回复",text:"已按流程形成回单；本地按钮不是现实世界的 DID 签名或正式上市公司披露。"});
notice(q.kind==="creator"?"内容合作服务已回复（模拟）":"IR 正式流程回单（模拟）",q.id+"：发行人模拟审批完成。可在 AWiki Me／ChatGPT 接入模拟查看已接收的回单。",q.id,"reply");
logAura("receipt",q.id+" 已收到模拟 IR 服务回单，相关资料可从本人工作界面继续。");save();toast("已通过模拟发行人审批，并写入用户回单")}
function returnInquiry(id){if(s.ui.role!=="issuer"){toast("仅模拟发行人可退回草稿");return;}const q=s.inquiries.find(x=>x.id===id);if(!q||q.status!=="drafted"){toast("当前状态不可退回");return;}q.status="revision";q.draft="";q.updatedAt=stamp();q.events.push({at:stamp(),actor:"发行人审批方（模拟）",kind:"发回修改",text:"来源或措辞仍需要核对，尚未形成对外回应。"});save();toast("已退回服务商重新准备")}
function voteCreator(){const r=s.ui.role;if(!["provider","issuer"].includes(r))return;s.space.creator[r+"Vote"]=true;s.space.events.push({at:stamp(),actor:r==="issuer"?"发行人（模拟）":"IR 服务商（模拟）",text:"批准内容合作方加入限定的公开资料合作范围；仅为模拟流程。"});if(s.space.creator.providerVote&&s.space.creator.issuerVote)s.space.creator.joined=true;save();toast("已记录当前角色的模拟邀请投票")}
function draftCreator(){if(s.ui.role!=="provider"){toast("仅服务商可准备合作方案");return;}s.creator.draft="合作对象：财经内容创作者；服务购买方：发行人／IR 服务机构。交付：公开资料解读稿和线上交流内容。要求：显著商业合作标识、引用正式披露、禁止个性化荐股；需发行人审批后公开。";s.creator.status="drafted";s.creator.events.push({at:stamp(),actor:PROVIDER,kind:"拟定公开内容合作方案",text:"已形成范围和赞助披露条款，交发行人审核。"});save();toast("内容合作 Board 草稿已准备")}
function approveCreator(){if(s.ui.role!=="issuer"||s.creator.status!=="drafted"){toast("需要发行人角色且存在待批准草稿");return;}if(!s.space.creator.joined){toast("先完成 Space 内双主体对创作者准入的治理批准");return;}s.creator.status="approved";s.creator.approved=s.creator.draft;s.creator.events.push({at:stamp(),actor:ISSUER,kind:"模拟批准",text:"仅批准范围明确的公开披露材料合作，不代表真实合同、佣金结算或证券投资建议。"});save();toast("创作者合作 Board 已完成模拟审核")}
function markRead(id){const n=s.inbox.find(x=>x.id===id);if(!n)return;n.read=true;save()}
function chatMsg(role,text){s.ui.chatTurns.push({role,text:String(text)});if(s.ui.chatTurns.length>36)s.ui.chatTurns=s.ui.chatTurns.slice(-36);save()}
function reset(){if(!confirm("只重置这几个 GitHub Pages 演示页面在本浏览器中的虚构工作状态？"))return;s=fresh();save();toast("已重置演示")}
function exportData(){const obj={exportedAt:stamp(),demo:true,note:"Simulated data only. Same-origin localStorage is not encryption, real tenant isolation or DID signing.",identity:clone(s.identity),inquiries:clone(s.inquiries),tasks:clone(s.tasks),space:clone(s.space),inbox:clone(s.inbox)};const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="awiki-ir-v55-demo-state.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
function portalUrl(){return new URL("./awiki-ir-pr-portal-v2.html",location.href).href;}
function url(path){return new URL("./"+path,location.href).href;}
function nav(){const current=document.body.getAttribute("data-page");const links=[["hub","awiki-ir-demo-hub-v2.html","总览"],["portal","awiki-ir-pr-portal-v2.html","PR 独立站"],["chatgpt","awiki-ir-chatgpt-v2.html","ChatGPT 模拟"],["me","awiki-ir-me-v2.html","AWiki Me"],["backoffice","awiki-ir-backoffice-v2.html","IR 协同后台"]];return '<header class="topbar"><a class="brand" href="./awiki-ir-demo-hub-v2.html">A<span>Wiki</span><small>IR · V5.5</small></a><div class="links">'+links.map(x=>'<a href="./'+x[1]+'" class="'+(current===x[0]?"current":"")+'">'+x[2]+'</a>').join("")+'<span class="demo-tag">DEMO / 全流程模拟</span></div></header>'}
const QR={n:37,b64:"/goEQ/wRCH+QbrwBRrt1HYbF26rv1K7BYqYdB/qqqq/gH//WAL4ShfPjjTlVQ5mm/T6nKd54aJC//b1/kLxdlIItPqnXfRQjIvIfRz7Hpc/eK2m2youFhulFTHwUqCQ9blxjepQiWb8zT2QVn+BzNyiVz6dsO3pLJr90JMdYcjhPCz+1DfqAehz0Y/jGqarwUbARGrqdP3+9124K9m6+gqIfBFUJWZ/vJDRPgA=="};
function drawQR(id){const canvas=document.getElementById(id);if(!canvas||!canvas.getContext)return;const ctx=canvas.getContext("2d"),n=QR.n,raw=atob(QR.b64);canvas.width=n*4;canvas.height=n*4;canvas.style.width="148px";canvas.style.height="148px";ctx.fillStyle="#fff";ctx.fillRect(0,0,148,148);ctx.fillStyle="#173741";for(let i=0;i<n*n;i++)if(raw.charCodeAt(i>>3)&(1<<(7-(i%8))))ctx.fillRect((i%n)*4,Math.floor(i/n)*4,4,4);}
window.AW={get s(){return s},KEY,VERSION,ISSUER,PROVIDER,DOCS,esc,fmtTime,stamp,toast,save,sync,copy,signed,signin,wake,inquiry,creatorRequest,task,routeTask,draftInquiry,approveInquiry,returnInquiry,voteCreator,draftCreator,approveCreator,markRead,chatMsg,reset,exportData,nav,drawQR,portalUrl,url,clone,logAura,notice,render:null};
})();
