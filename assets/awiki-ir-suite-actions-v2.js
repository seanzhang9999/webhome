/* Event delegation for four independent AWiki IR demonstration pages.
   Real API transport, identity, and ChatGPT trigger are not implemented. */
(function(){
"use strict";const A=window.AW;if(!A)return;
const $=id=>document.getElementById(id);
function val(id){return $(id)?.value||""}
function checked(id){return !!$(id)?.checked}
function rerender(){A.save();}
function selectPortalTab(tab){A.s.ui.portalTab=tab;A.s.ui.portalForm="none";rerender();}
function showPortalForm(f){A.s.ui.portalTab="inquiry";A.s.ui.portalForm=f;rerender();}
function signin(){A.signin();}
function sendPortalQuestion(){
if(!checked("portalQuestionConsent")){A.toast("请先确认本次共享范围");return;}
const id=A.inquiry({text:val("portalQuestion"),source:val("portalSource")||"IR-DEMO-AR25",origin:"pr"});
if(id){A.s.ui.portalTab="inquiry";A.s.ui.portalForm="none";rerender();A.toast("已进入 IR 服务商事项队列："+id+"（本地演示）");}
}
function makePortalTask(){
if(!checked("portalTaskConsent")){A.toast("请先确认私人任务保存范围");return;}
const id=A.task({title:val("portalTaskTitle"),route:val("portalTaskRoute")==="chatgpt"?"chatgpt":"me",origin:"pr"});
if(id){A.s.ui.portalForm="none";rerender();A.toast("私人任务 "+id+" 已在 AWiki Me 与外部 PA 模拟中可读取");}
}
function creatorSubmit(){
if(!checked("creatorConsent")){A.toast("请先确认仅提交合作意向文本");return;}
let id=A.creatorRequest(val("creatorText"),"pr-creator");
if(id)A.toast("已模拟发送商务合作请求 "+id+"；需要专业与合规审核");
}
function meSend(){
if(!checked("meConsent")){A.toast("请确认本次只提交选定问题");return;}
const id=A.inquiry({text:val("meQuestion"),origin:"me"});
if(id){A.s.ui.mePrefill="";A.s.ui.meTab="overview";rerender();}
}
function chatSend(){
const input=val("chatInput").trim();if(!input){A.toast("请输入模拟对话内容");return;}
A.chatMsg("user",input);
let answer="我可以使用已公开的 IR 演示资料协助整理问题。如果需要真实的正式 IR 回复，请先在下方审核拟提交文本，并明确授权；我不会自动读你的私人工作或下单。";
if(/数据|增长|收入|财报/.test(input))answer="本演示的公开资料标识 IR-DEMO-AR25，虚构的 2024 和 2025 收入分别为 HK$7.8bn 与 HK$8.4bn。所有数字仅为教学演示；如需公司解释，必须发送经你确认的正式 IR 请求。";
if(/跟踪|提醒|订阅|通知/.test(input))answer="你可以创建私人跟踪任务并委托给 AWiki AURA。任务将在 AWiki Me 一览显示，也可由本模拟页读取；当前不会真实唤醒 ChatGPT 账户。";
A.chatMsg("assistant",answer);
}
async function chatRead(){
A.chatMsg("user","请通过提供的独立 PR URL 读取公司已公布的资料，保留来源。");
try{
const res=await fetch("./awiki-ir-public-content-v2.json",{cache:"no-store"});if(!res.ok)throw new Error("HTTP "+res.status);
const o=await res.json();if(!o.demo||!Array.isArray(o.sources))throw new Error("不是预期格式");
const titles=o.sources.map(s=>s.title+" ["+s.id+"]").join("；");
A.chatMsg("assistant","已从 GitHub Pages 上的实际公开 JSON 文件读取演示资料："+titles+"。\\n注意：发行人完全虚构，没有真实公告、投资建议或任何账户访问。");
}catch(e){A.chatMsg("assistant","读取静态 JSON 失败："+String(e.message||e)+"。你仍可以从独立 PR 页面查看相同的演示内容；无法声称已成功访问远程资料。");}
}
function chatInterpret(){
A.chatMsg("user","请解释两年的演示收入变化，并说明出处与信息边界。");
const v=((8.4-7.8)/7.8*100).toFixed(2);
A.chatMsg("assistant","使用演示来源 IR-DEMO-AR25 的虚构数值：2024 年 HK$7.8bn，2025 年 HK$8.4bn，数学变化率约 "+v+"%。\\n这不是上市公司的真实财务信息，更不是证券推荐或经营预测。无法凭这些数字推断未来经营表现。");
}
function chatPrefill(){
A.s.ui.chatPrefill="请依据 FY2025 公开资料说明 2024 与 2025 收入的统计口径，并指出可引用的报告段落。";
A.chatMsg("user","请准备正式 IR 问询草稿，但先不要发送。");
A.chatMsg("assistant","草稿已放入下方“从 ChatGPT 发起 IR 问询”。必须由你检查文本、勾选共享范围并确认后，才在 AWiki 本地演示中创建 Board。");
}
function chatSubmit(){
if(!checked("chatConsent")){A.toast("必须明确确认提交范围后才能发送");return;}
const t=val("chatQuestion");
const id=A.inquiry({text:t,origin:"chatgpt",source:"IR-DEMO-AR25"});
if(id){A.chatMsg("assistant","已按你的确认，在 AWiki 本地创建 IR 请求 "+id+"；它将由服务商和发行人分步处理。不会自动向真实公司发送。");}
}
function chatTask(){
const id=A.task({title:val("chatTask"),route:"chatgpt",origin:"chatgpt",source:"IR-DEMO-AR25"});
if(id)A.chatMsg("assistant","已生成私人委托 "+id+"。AWiki Me 一览将显示此任务，后续可以从本模拟页主动读取。不属于企业 IR 的共享资料。");
}
function chatPoll(){
const tasks=A.s.tasks.filter(t=>t.route==="chatgpt");
const q=A.s.inquiries.filter(x=>x.status==="approved");
const taskText=tasks.length?tasks.slice(0,5).map(t=>t.id+": "+t.title).join("；"):"没有指定给本模拟 PA 接续的私人任务";
const replyText=q.length?q.slice(0,4).map(x=>x.id+": "+x.response.slice(0,180)).join("；"):"当前没有新的模拟 IR 已批准回复";
A.chatMsg("user","请查询我在 AWiki 工作代理里的事项和新回单。");
A.chatMsg("assistant","这是一次模拟的授权状态读取，不是实际 ChatGPT MCP/Webhook 推送。\\n私人委托："+taskText+"。\\nIR 回单："+replyText+"。");
}
function clickAction(id){
const u=A.s.ui;
if(id==="reset"){A.reset();return;}
if(id==="signin"){signin();return;}
if(id==="wake"){A.wake(document.body.dataset.page==="portal"?"维港样例控股 · 公开 IR 资料":"AWiki Me · 我的持续事项");return;}
if(id==="export"){A.exportData();return;}
if(id==="copy-portal"){A.copy(A.portalUrl());return;}
if(id==="portal-form-question"){showPortalForm("question");return;}
if(id==="portal-form-task"){showPortalForm("task");return;}
if(id.startsWith("portal-tab-")){selectPortalTab(id.slice(11));return;}
if(id==="portal-send-question"){sendPortalQuestion();return;}
if(id==="portal-create-task"){makePortalTask();return;}
if(id==="portal-creator-submit"){creatorSubmit();return;}
if(id.startsWith("portal-source-")){const d=A.DOCS.find(x=>x.id===id.slice(14));if(d){A.toast(d.title+" · "+d.sub+"；本页仅提供演示来源，非真实港交所文件。");}return;}
if(id==="chat-read"){chatRead();return;}
if(id==="chat-interpret"){chatInterpret();return;}
if(id==="chat-prefill-question"){chatPrefill();return;}
if(id==="chat-poll"){chatPoll();return;}
if(id==="chat-send"){chatSend();return;}
if(id==="chat-submit"){chatSubmit();return;}
if(id==="chat-create-task"){chatTask();return;}
if(id==="me-open-overview"){A.s.ui.meTab="overview";A.save();return;}
if(id==="me-submit-question"){meSend();return;}
if(id.startsWith("me-read:")){A.markRead(id.slice(8));return;}
if(id.startsWith("me-route-chatgpt:")){A.routeTask(id.slice(17),"chatgpt");return;}
if(id.startsWith("me-view-question:")){
  const q=A.s.inquiries.find(x=>x.id===id.slice(17));
  if(!q){A.toast("未找到相应 IR 请求");return;}
  u.meTab="overview";u.meSelected=q.id;rerender();return;
}
if(id.startsWith("me-followup:")){
  const q=A.s.inquiries.find(x=>x.id===id.slice(12));
  if(!q)return;
  u.meTab="messages";u.mePrefill="关于此前请求 "+q.id+"（"+q.source+"），我想进一步确认：";
  rerender();return;
}
if(id.startsWith("bo-tab-")){u.backTab=id.slice(7);rerender();return;}
if(id.startsWith("bo-select:")){u.selectedInquiry=id.slice(10);u.backTab="boards";rerender();return;}
if(id==="bo-vote"){A.voteCreator();return;}
if(id.startsWith("bo-draft:")){A.draftInquiry(id.slice(9));return;}
if(id.startsWith("bo-approve:")){A.approveInquiry(id.slice(11));return;}
if(id.startsWith("bo-return:")){A.returnInquiry(id.slice(10));return;}
if(id==="bo-draft-creator"){A.draftCreator();return;}
if(id==="bo-approve-creator"){A.approveCreator();return;}
A.toast("此项演示操作尚未配置");
}
document.addEventListener("click",e=>{
const nav=e.target.closest("[data-me-tab]");if(nav){A.s.ui.meTab=nav.dataset.meTab;A.save();return;}
const back=e.target.closest("[data-bo-tab]");if(back){A.s.ui.backTab=back.dataset.boTab;A.save();return;}
const role=e.target.closest("[data-bo-role]");if(role){A.s.ui.role=role.dataset.boRole;A.save();return;}
const item=e.target.closest("[data-bo-id]");if(item){A.s.ui.selectedInquiry=item.dataset.boId;A.s.ui.backTab="boards";A.save();return;}
const button=e.target.closest("[data-action]");if(button)clickAction(button.dataset.action);
});
document.addEventListener("input",e=>{
if(e.target.id==="growth"){
const n=Number(e.target.value);A.s.ui.growth=n;
const a=$("growthN");if(a)a.textContent=n+"%";
const result=$("growthResult");if(result)result.innerHTML="如果仅按虚构基数 HK$8.4bn 乘 (1+"+n+"%)，数学结果为 <b>HK$"+(8.4*(1+n/100)).toFixed(2)+"bn</b>。这不是公司预测。";
try{localStorage.setItem(A.KEY,JSON.stringify(A.s));}catch(err){}
}
});
})();
