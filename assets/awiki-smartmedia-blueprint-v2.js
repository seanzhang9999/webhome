
/* Branching strategy flowchart: clarity about consent, data domains and operational path. */
(function(){
"use strict";
const detail={
  public:{title:"A｜只阅读 / 使用一次数字功能",tag:"不要求身份 · 不调用用户私域",summary:"公开资料与普通 Web 互动就可以交付完整价值。例如一位学生读取侯老师的原文、选择问题导读，或调整 Token 成本课堂模型；过程无需自动创建工作事项、加载私人记忆或持久运行 AI。",boundary:"不必登录、不必调用模型、不必接入 Board。页面引用必须指向真实公开来源，AI 编辑导读不是作者正式声明。",link:"./awiki-hou-smartmedia-v1.html",label:"打开作者智媒体 →"},
  private:{title:"B｜嵌入式阿维 ↔ AWiki 私域工作",tag:"先获授权再读取 · 只回写选择的结果",summary:"用户在作者站当前页面选中一段文章或提出问题，按需唤起自己的阿维，并选择使用 AWiki WorkHub 中特定的研究笔记或个人目标。用户侧执行环境基于该上下文处理，然后只把经用户选定的摘要、工作请求或回单返回当前网页或自己的 Inbox。也可以将工作委派给获准的本地电脑、云节点或专业 Agent。",boundary:"这是未来正式隔离部署的设计目标：站点 JavaScript 与私人数据执行器须处于清楚隔离的安全域。现有纯前端 Demo 未完成 DID 授权、真实私域计算或第三方云模型数据保护。",link:"./awiki-hou-smartmedia-v1.html",label:"在作者站唤起阿维 →"},
  pa:{title:"C｜用户保留 ChatGPT，当作自己的主入口",tag:"公开读取无登录 · 服务动作另授权",summary:"读者复制独立站 Link＋公开 Skill 给自己的 ChatGPT，ChatGPT 在可用的网页工具中阅读原始文章及版本。需要保存研究、给作者提交问题或申请服务时，再通过获支持的连接器把明确的事项委托给 AWiki AURA；AWiki 负责持久工作、回单和资源引用。外部 PA 可在支持的情况下主动查询或订阅事件，不必迁走全部私人聊天。",boundary:"复制文本/链接绝不自动建立 MCP、ACP、PAP、OAuth、ChatGPT 账户权限。任何真实工具访问能力必须客户端支持并由用户授权。",link:"./awiki-hou-agent-skill-v1.md",label:"查看公开 Skill ↗"},
  discussion:{title:"D｜学生／同行参与：从问题到有治理的 Board",tag:"只发送明确选定的问题与来源",summary:"读者或学生提出问题，默认在私人草稿里确认内容；需要真正求助作者时，才创建带来源、参与者和可见范围的 Board。作者数字编辑可以归并重复问题、准备候选意见，但新的学术立场和对外回应只能由作者本人或获准代理审核。回复可经网页、DID Inbox、邮箱和指定抄送方式提供，渠道分别执行授权。",boundary:"本地演示只是浏览器保存和角色按钮，不代表作者收到了问题，更不等于邮件/DID已投递。对学生个人数据、课件和作品需要单独许可。",link:"./awiki-hou-smartmedia-v1.html",label:"进入议题讨论 →"},
  author:{title:"E｜作者出品：不靠日更仍让知识发挥价值",tag:"原文来源、作者确认、内容版本先行",summary:"先利用真实的历史文章和公开讲座材料形成可查的个人门户；作者依旧保留在既有媒体、公众号或机构网站发表的自由。站内导读、公开互动、重复问答和学生课程练习由数字编辑辅助，但需标记来源、版本和作者批准状态。时间有限时仍可服务新读者，并把少量值得回应的问题整理给本人。",boundary:"公开文章不等于原文全文转载授权；实际内容使用、AI 自动生成和公开发表范围应先得到作者和相关权利人许可。",link:"./awiki-hou-smartmedia-v1.html",label:"查看作者内容运营演示 →"},
  enterprise:{title:"F｜复制到机构与 IR：内容前台＋受控协同后台",tag:"V5.5 Pack／Space／Matter／Board",summary:"向香港 IR 服务商出售可信发布、问询受理、数字员工运营以及上市公司审核的实际交付能力；上市公司拥有正式披露和回复责任，服务商管理运营工作，投资者保留私人研究与阿维。企业 Agent Governance 进一步为员工和专业 Agent 提供事项上下文、受管外发和任务授权检查。开放公共 AWiki 让 FDE 与领域服务者分销标准化方案包。",boundary:"真实 IR 运营须遵守适用披露、客户隐私及金融行业规则；本套 Demo 不具备真正的企业多租户隔离、签名、邮箱投递或交易接口。",link:"./awiki-ir-demo-hub-v2.html",label:"打开香港 IR 四端样板 →"}
};
function select(k){
 const d=detail[k];if(!d)return;
 document.querySelectorAll(".path-tabs [data-route]").forEach(x=>{const active=x.dataset.route===k;x.classList.toggle("on",active);x.setAttribute("aria-pressed",String(active))});
 document.querySelectorAll(".flow-route[data-path]").forEach(x=>{const active=x.dataset.path===k;x.classList.toggle("focus",active);x.classList.toggle("dim",!active)});
 const target=document.getElementById("pathDetail");if(!target)return;
 target.innerHTML='<div class="row" style="align-items:start;justify-content:space-between;gap:9px"><h3>'+d.title+'</h3><span class="badge">'+d.tag+'</span></div><p>'+d.summary+'</p><div class="warn" style="margin:12px 0"><b>授权与实施边界：</b>'+d.boundary+'</div><a href="'+d.link+'">'+d.label+'</a>';
}
document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll(".path-tabs [data-route]").forEach(button=>button.addEventListener("click",()=>select(button.dataset.route)));
 select("private");
 const key=new URLSearchParams(location.search).get("route");if(detail[key])select(key);
});
})();
