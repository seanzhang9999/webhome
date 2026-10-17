/* IR v3 supplemental interface actions. Distinct from business action engine.
   All cross-page behavior remains local simulation. */
(function(){
"use strict";
const A=window.AW;
if(!A)return;
const u=()=>A.s.ui;
document.addEventListener("click",event=>{
const n=event.target.closest("[data-v3-nav]");
if(n){const val=n.dataset.v3Nav||"";const sep=val.indexOf(":");if(sep>0){const side=val.slice(0,sep),tab=val.slice(sep+1);if(side==="me")u().meTab=tab;else{u().v3BackNav=tab;if(tab==="work"&&!u().backTab)u().backTab="space";}A.save();}return;}
const workMe=event.target.closest("[data-v3-me-work]");
if(workMe){u().v3MeWorkTab=workMe.dataset.v3MeWork;u().meTab="work";A.save();return;}
const workBack=event.target.closest("[data-v3-back-work]");
if(workBack){const tab=workBack.dataset.v3BackWork;u().v3BackNav="work";u().backTab={matters:"matters",resources:"artifacts",space:"space",pack:"pack"}[tab]||"space";A.save();return;}
const close=event.target.closest("[data-v3-close-aura]");
if(close){u().v3AuraVisible=false;A.save();return;}
const newChat=event.target.closest("[data-v3-chat-new]");
if(newChat){u().chatTurns=[{role:"assistant",text:"已新建一个本地 ChatGPT 风格的演示会话。真实 ChatGPT 的对话和隐私历史不会因此发生变化。请先阅读 PR 独立站的公开 Skill，再按授权委托工作。"}];u().chatPrefill="";A.save();return;}
const a=event.target.closest("[data-action]");
if(!a)return;
if(a.dataset.action==="v3-copy-prompt"){
if(window.IRV3)A.copy(window.IRV3.chatgptPrompt());
return;
}
if(a.dataset.action==="v3-open-chatgpt"){
if(typeof window.open==="function")window.open("https://chatgpt.com/","_blank","noopener,noreferrer");
else A.toast("当前客户端未开放新窗口，请手动访问 https://chatgpt.com/");
return;
}
if(a.dataset.action.startsWith("me-select:")){u().meTab="work";u().v3MeWorkTab="matters";A.save();return;}
if(a.dataset.action.startsWith("me-doc:")){u().meTab="work";u().v3MeWorkTab="resources";u().v3MeDoc=a.dataset.action.slice(7);A.save();return;}
if(a.dataset.action.startsWith("me-space:")){u().meTab="work";u().v3MeWorkTab="space";A.save();return;}
if(a.dataset.action==="me-pack"){u().meTab="work";u().v3MeWorkTab="pack";A.save();return;}
});
document.addEventListener("change",event=>{
if(event.target.id==="portalReplyChannel"){
const selected=event.target.value;
u().v3ReplyChannel=selected;
const w=document.getElementById("portalEmailWrap");
if(w)w.classList.toggle("hide",selected==="awiki");
try{localStorage.setItem(A.KEY,JSON.stringify(A.s));}catch(err){}
}
});
})();
