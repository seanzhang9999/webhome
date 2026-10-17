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
if(!checked("portalQuestionConsent")){A.toast("请先确认本次要共享的问题与回执渠道");return;}
const chosen=val("portalReplyChannel")||A.s.ui.v3ReplyChannel||"awiki";
const replyChannels=chosen==="both"?["awiki","email"]:[chosen];
const id=A.inquiry({text:val("portalQuestion"),source:val("portalSource")||"IR-DEMO-AR25",origin:"pr",replyChannels,replyEmail:val("portalEmail")});
if(id){A.s.ui.portalTab="inquiry";A.s.ui.portalForm="none";A.save();A.toast("已创建 IR 问询 "+id+"（模拟）；不会真的发送邮件。");}
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
A.chatMsg("user","请先阅读独立 PR 站的 Skill 说明和公开数据，并保留来源。");
A.chatMsg("tool","read_public_content({skill: './awiki-ir-skill-v3.md', public_content: './awiki-ir-public-content-v2.json'})");
try{
const [skillRes,dataRes]=await Promise.all([fetch("./awiki-ir-skill-v3.md",{cache:"no-store"}),fetch("./awiki-ir-public-content-v2.json",{cache:"no-store"})]);
if(!skillRes.ok||!dataRes.ok)throw new Error("公开资料 GET 失败");
const skill=await skillRes.text(),data=await dataRes.json();
if(!skill.includes("demo_only: true")||!data.demo||!Array.isArray(data.sources))throw new Error("公开说明并非预期的演示版本");
A.chatMsg("tool","read_public_content → HTTP 200；来源数量："+data.sources.length+"；Skill 标记：demo_only；受保护动作接口：尚未接入真实 MCP。");
A.chatMsg("assistant","已从公开页面实际读取 Skill 和演示 JSON。可引用的来源："+data.sources.map(x=>x.id+"（"+x.title+"）").join("；")+"。这些都是虚构资料；如需提交 IR 请求，我会先让你确认文本与授权范围。");
}catch(e){A.chatMsg("tool","read_public_content failed："+String(e.message||e));A.chatMsg("assistant","无法完成公开资料读取。不会假装成功调用了 Skill 或 MCP，请稍后再试或直接阅读独立 PR 页面。");}
}
function chatInterpret(){
A.chatMsg("user","根据公开 IR 演示数据计算两年收入变化，并给出处。");
A.chatMsg("tool","read_public_content('IR-DEMO-AR25') → 已读取演示来源；以下为本地数学计算，不是模型预测。");
const n=((8.4-7.8)/7.8*100).toFixed(2);
A.chatMsg("assistant","演示来源 IR-DEMO-AR25：2024 年 HK$7.8bn，2025 年 HK$8.4bn，数学变化约 "+n+"%。虚构数据不对应任何真实上市公司；不能据此推断经营前景或提供投资建议。");
}
function chatPrefill(){
A.s.ui.chatPrefill="请依据 FY2025 公开资料说明 2024 与 2025 收入的统计口径，并指出可引用的报告段落。";
A.chatMsg("user","请准备正式 IR 问询草稿，但先不要发送。");
A.chatMsg("assistant","草稿已放入下方“从 ChatGPT 发起 IR 问询”。必须由你检查文本、勾选共享范围并确认后，才在 AWiki 本地演示中创建 Board。");
}
function chatSubmit(){
if(!checked("chatConsent")){A.toast("必须明确确认向 IR 提交的内容和范围");return;}
const text=val("chatQuestion");
const id=A.inquiry({text,origin:"chatgpt",source:"IR-DEMO-AR25",replyChannels:["awiki"]});
if(id){
A.chatMsg("tool","create_service_request({source:'IR-DEMO-AR25', scope:'approved_question_only', reply_channel:'awiki', confirmation:true}) → "+id+"（本浏览器模拟）");
A.chatMsg("assistant","已按照你的确认将本次具体问题归入 AWiki 模拟服务事项 "+id+"。服务商会准备草稿，发行人独立审核；不是通过真实 ChatGPT 连接器发送，也不是证券正式披露。");
}
}
function chatTask(){
const id=A.task({title:val("chatTask"),route:"chatgpt",origin:"chatgpt",source:"IR-DEMO-AR25"});
if(id){
A.chatMsg("tool","save_to_awiki({scope:'private_workhub', route:'chatgpt', user_confirmed:true}) → "+id+"（模拟）");
A.chatMsg("assistant","你的私人工作委托 "+id+" 已写入本浏览器 AWiki WorkHub 模拟；在 AWiki Me 一览能看到。它不会自动共享给上市公司，也不会触发真实 ChatGPT。");
}
}
function chatPoll(){
const tasks=A.s.tasks.filter(t=>t.route==="chatgpt");
const replies=A.s.inquiries.filter(x=>x.status==="approved"&&(x.replyChannels||["awiki"]).includes("awiki"));
A.chatMsg("user","请读取我的 AWiki 私人委托和已批准的新 IR 回单。");
A.chatMsg("tool","get_work_status({user_scope:'awiki_only', permitted_refs:true}) → "+tasks.length+" private task(s), "+replies.length+" approved AWiki reply/replies（本地模拟）");
A.chatMsg("assistant","这是一次模拟的授权状态读取，不是实际 ChatGPT Webhook 推送。\n私人委托："+(tasks.length?tasks.map(t=>t.id+"："+t.title).join("；"):"暂无")+"。\nIR 回单："+(replies.length?replies.map(x=>x.id+"："+x.response.slice(0,150)).join("；"):"暂无")+"。");
}
function clickAction(id){
const u=A.s.ui;
if(id==="reset"){A.reset();return;}
if(id==="signin"){signin();return;}
if(id==="wake"){if(document.body.dataset.page==="portal")u.v3AuraVisible=true;A.wake(document.body.dataset.page==="portal"?"维港样例控股 · 公开 IR 资料":"AWiki Me · 我的持续事项");return;}
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
if(id.startsWith("bo-resource:")){u.backTab="resource";u.v3SelectedResource=id.slice(12);u.v3BackNav="work";rerender();return;}
if(id.startsWith("bo-tab-")){u.backTab=id.slice(7);rerender();return;}
if(id.startsWith("bo-select:")){u.selectedInquiry=id.slice(10);u.backTab="boards";rerender();return;}
if(id==="bo-vote"){A.voteCreator();return;}
if(id.startsWith("bo-draft:")){A.draftInquiry(id.slice(9));return;}
if(id.startsWith("bo-approve:")){A.approveInquiry(id.slice(11));return;}
if(id.startsWith("bo-return:")){A.returnInquiry(id.slice(10));return;}
if(id==="bo-draft-creator"){A.draftCreator();return;}
if(id==="bo-approve-creator"){A.approveCreator();return;}
if(id.startsWith("me-select:")||id.startsWith("me-doc:")||id.startsWith("me-space:")||id==="me-pack"||id==="v3-copy-prompt"||id==="v3-open-chatgpt")return;
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
