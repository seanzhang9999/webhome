
/* AWiki Smart Media: economist & AI scholar concept. Front-end demo only.
   No real user identity, AI execution, delivery, auth or publishing. */
(function(){
"use strict";
const KEY="awiki.hou.media.v1.20261017";
const ROOT="./";
const PAGE_URL="https://seanzhang9999.github.io/webhome/awiki-hou-smartmedia-v1.html";
const JSON_URL="https://seanzhang9999.github.io/webhome/awiki-hou-smartmedia-public-v1.json";
const SKILL_URL="https://seanzhang9999.github.io/webhome/awiki-hou-agent-skill-v1.md";
const QR_GRID={size:45,data:"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+ZQVL+AQQPHOQQC6zYQa6AXXYhuXQC6qXlK6AQUBnDQQD+qqqr+AAHH+WAAC+XYXz4AeFeUhLgBOGfT7mAapyeHiQAOh9rX+AaB9dlIAB/C6oV2ASB6Mm8gDnVz5HoAADripJgDDki6fGAFoxTX8QC6MEPG4AWPJ6tCAC/u8yz2ANDN/k8wBbPJXmoAZgW3tjACHfdCTWATLqOn4QCbBVHf+AAHMc1GAD+a6pquAQVLARGgC65z/fuAXVvg/1QC66AoIOAQTJCVUQD+xkJAuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="};
const menu=[["home","首页"],["articles","文章"],["discussion","议题讨论"],["lab","学生互动"],["resources","研究资料"],["services","交流与服务"],["inbox","我的收件箱"],["editor","作者运营演示"]];
const now=()=>new Date().toISOString();
const base=()=>({
 version:1,tab:"home",bound:false,auraOpen:false,selectedArticle:null,articlesLocal:[],
 threads:[],outgoing:[],privateWork:[],delegations:[],inbox:[],deliveryDraft:null,
 privateCompute:null,lab:{requests:1200,cost:0.12,reuse:60,value:0.5},pendingQuestionSource:null,
 selectedThread:null,seq:1,authorAuthDemo:false,lastAction:""
});
let st=base(),publicData=null;
try{let raw=localStorage.getItem(KEY);if(raw){let o=JSON.parse(raw);if(o&&o.version===1)st=Object.assign(base(),o);}}catch(e){}
const esc=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bid=(act,label,cl="")=>'<button type="button" class="btn '+cl+'" data-act="'+esc(act)+'">'+label+'</button>';
const tag=(label,cl="")=>'<span class="pill '+cl+'">'+esc(label)+'</span>';
const field=(id,label,help="")=>'<div class="field"><label for="'+id+'">'+label+'</label>'+(help?'<small>'+help+'</small>':"");
const urlOk=url=>{try{let u=new URL(url);return u.protocol==="https:"?u.href:null}catch(e){return null}};
const list=()=>[...(publicData?.content||[]),...st.articlesLocal];
const byId=id=>list().find(x=>x.id===id);
const selected=()=>byId(st.selectedArticle)||list()[0]||null;
const maskEmail=email=>{const [name,host]=email.split("@");return (name?name.slice(0,1):"x")+"***@"+host};
function toast(x){let d=document.getElementById("toast");if(!d)return;d.textContent=x;d.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>d.style.display="none",3700);}
function save(renderNow=true){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){toast("此浏览器没有保存本地演示状态的权限。")}if(renderNow)render();}
function bind(){if(st.bound){toast("当前已绑定虚构的 AWiki 用户身份");return true;}st.bound=true;st.inbox.unshift({id:"IN-"+st.seq++,text:"演示用户 DID 已绑定：did:wba:demo.invalid:hou-reader-01。不是正式 AWiki 登录。",time:now(),type:"identity"});save();toast("模拟登录成功；没有连接任何真实账号");return true;}
function needBind(){if(!st.bound){toast("请先模拟 AWiki 身份绑定，才能保存私人工作或 DID Inbox 回执");return false;}return true;}
function copy(x){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(x).then(()=>toast("已复制")).catch(()=>legacyCopy(x));}else legacyCopy(x);}
function legacyCopy(x){const el=document.createElement("textarea");el.value=x;document.body.appendChild(el);el.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}el.remove();toast(ok?"已复制":"当前浏览器复制受限，可手动选择文本");}
function openChatGPT(){const tab=window.open("https://chatgpt.com/","_blank","noopener,noreferrer");if(!tab)toast("请手动打开 chatgpt.com，再粘贴刚复制的提示词。");}
function prompt(){let item=selected();return '请阅读侯宏老师的 AI × 经济学智媒体概念站公开入口 '+PAGE_URL+' 。优先读取来源说明 '+SKILL_URL+' 及来源 JSON '+JSON_URL+' ，引用原文时请核对原始发表链接。请围绕'+(item?"《"+item.title+"》":"智能体互联网与经济学")+'开展研究，不要把站点示例和学生模拟数据当成侯老师的正式观点。若需要读取我的私人 AWiki 资料、提交课堂问题或向作者联系，请先向我展示将使用的具体内容与授权范围并取得确认；不能仅因网页链接就认定具有受保护操作权限。';}
function nav(){return '<div class="banner-note"><b>非官方产品概念站 · 供与侯老师讨论</b>　|　引用公开文章，但所有头像、互动、回复、运营和权限均非真实服务</div><header class="header"><div class="header-inner"><a class="brand" href="./awiki-hou-smartmedia-v1.html"><span class="mark">A</span>侯宏 · <span style="color:#0c8c81">AI 智媒体</span><small>经济 × AI</small></a><nav class="nav" aria-label="独立站导航">'+menu.map(x=>'<button type="button" data-tab="'+x[0]+'" class="'+(st.tab===x[0]?"active":"")+'">'+x[1]+'</button>').join("")+'</nav><div class="head-actions">'+bid("copy-chatgpt","复制给 ChatGPT","sm")+bid("bind",st.bound?"演示已登录":"AWiki DID 登录","sm")+'</div></div></header>';}
function hero(){
return '<div class="hero"><div class="hero-copy"><div class="eyebrow">PERSONAL SMART MEDIA · PUBLIC DEMONSTRATION</div><h1>侯宏老师的<br><span>AI × 经济学智媒体</span></h1><p>不只是一个展示文章的网站：把公开研究、议题讨论、学生课堂互动与专业交流连接起来；人直接阅读，也可以在当前页面唤起自己的阿维，或让已有 ChatGPT 使用公开知识与获准的服务。</p><div class="row" style="margin-top:24px">'+bid("tab-articles","阅读研究文章","primary")+bid("open-aura","✦ 唤起我的阿维")+bid("copy-chatgpt","复制给我的 ChatGPT")+'</div><div class="hero-tags"><span>来源明确</span><span>学生与读者互动</span><span>个人数据受控</span><span>Agent-ready 内容</span></div></div><div class="hero-side"><div class="hero-side-card"><div class="eyebrow" style="color:#9ee9dc">最小可传播单元</div><b>一份公开文章 · 三种进入方式</b><p>扫码／网页直接阅读；内嵌阿维按需加载当前内容；外部 PA 通过 URL 和公开 Skill 获取可用接口。</p><div class="hero-feature"><strong>① 内容与来源</strong>：文章、出版方、版本</div><div class="hero-feature"><strong>② 互动与研究</strong>：课堂模型、专题问题</div><div class="hero-feature"><strong>③ 委托与回应</strong>：私人工作、讨论 Board、回单</div><div class="row" style="margin-top:12px">'+bid("tab-discussion","参与议题","sm primary")+bid("tab-lab","学生互动模型","sm")+'</div></div></div></div>';
}
function features(){
const f=[["▤","精选文章","真实公开来源、结构化导读、可引用原文","articles"],["◎","研究议题","读者提问、证据补充、作者审核的 Board","discussion"],["▧","课堂互动","可改变经济假设的轻量实验模型","lab"],["◇","资料与 Agent","统一 Link、Skill、引用、机器可读资源","resources"],["✉","DID 收件箱","个人委托与回单，不依赖某次聊天","inbox"],["✦","我的阿维","按需唤起私人分身，不代替作者发言","aura"]];
return '<div class="section"><div class="section-head"><h2>这座智媒体站，不只是文章目录</h2>'+tag("六类可组合能力","grey")+'</div><div class="cards3">'+f.map(x=>'<div class="feature"><div class="symbol">'+x[0]+'</div><h3>'+x[1]+'</h3><p>'+x[2]+'</p><div style="margin-top:13px">'+bid(x[3]==="aura"?"open-aura":"tab-"+x[3],"体验 →","sm")+'</div></div>').join("")+'</div></div>';
}
function articleCard(x){
const published=x.status!=="local-only";return '<article class="article"><div class="row">'+tag((x.topics||[])[0]||"研究","green")+' '+tag(published?"公开外部来源":"浏览器本地示例","grey")+'</div><h3>'+esc(x.title)+'</h3><p>'+esc(x.summary||"作者演示草稿；不代表侯老师正式发表的观点。")+'</p><div class="source">'+esc(x.kind||"文章")+" · "+esc(x.date||"待正式发布")+" · "+esc(x.source||"未发布")+"<br>来源："+esc(x.id)+'</div><div class="actions">'+bid("article-"+x.id,"本页导读","sm primary")+(published&&urlOk(x.url)?'<a class="btn sm" href="'+esc(urlOk(x.url))+'" target="_blank" rel="noopener noreferrer">阅读正式原文 ↗</a>':"")+bid("discussion-source-"+x.id,"围绕本文讨论","sm")+'</div></article>';
}
function articleDetail(x){
if(!x)return '';
return '<div class="detail"><div class="row">'+tag("来源对象："+x.id,"blue")+tag(x.status==="local-only"?"本地模拟文章":"真实外部来源","gold")+'</div><h3 style="margin-top:12px">'+esc(x.title)+'</h3><p class="small">'+esc(x.summary||"这是模拟编辑稿，不代表公开发表的原文。")+'</p><h4 style="margin:15px 0 7px">可以带着哪些问题读？</h4><ul>'+((x.questions||["它讨论了什么问题？","与我的研究有什么关系？"]).map(q=>'<li>'+esc(q)+'</li>').join(""))+'</ul><div class="note"><b>引用边界：</b>本文页内导读由演示站编辑整理，并非作者的正式答复。引用学术观点时请核对原发表链接和上下文；外部 Agent 也应保留来源编号与版本。</div><div class="row" style="margin-top:13px">'+(urlOk(x.url)?'<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(urlOk(x.url))+'">打开原文核实 ↗</a>':"")+bid("open-aura","用个人阿维理解","")+bid("aura-save-public","把这份来源送入我的 AWiki（模拟）","")+'</div></div>';
}
function articleSection(inHome=false){
const docs=inHome?list().slice(0,2):list();
return '<section class="section" id="articles"><div class="section-head"><div><h2>'+(inHome?"公开研究 · 精选阅读":"文章与研究发表")+'</h2><p class="description">外部文章链接直达真实来源，作者的思想不由 AI 站点冒名改写。</p></div>'+(inHome?bid("tab-articles","查看全部","sm"):"")+'</div>'+(!docs.length?'<div class="card">正在加载公开文章索引……</div>':'<div class="cards2">'+docs.map(articleCard).join("")+'</div>')+(!inHome?articleDetail(selected()):"")+'</section>';
}
function linkEntry(){return '<div class="section"><div class="section-head"><h2>公开 Agent 入口</h2>'+tag("无须改用新的 Personal Agent","green")+'</div><div class="card"><div class="row" style="align-items:flex-start"><canvas id="site-qr" width="180" height="180" role="img" aria-label="扫码打开侯宏老师非官方智媒体演示站" style="width:135px;height:135px;background:white;padding:5px;border:1px solid var(--line);border-radius:9px;image-rendering:pixelated"></canvas><div class="flex" style="min-width:200px"><b>给人的是网页，给 Agent 的是可引用内容和服务说明</b><p class="small">'+esc(PAGE_URL)+'</p><div class="row">'+bid("copy-url","复制本页 URL","sm")+bid("copy-skill","复制 Skill 地址","sm")+bid("copy-chatgpt","复制给 ChatGPT 的提示词","sm primary")+'</div><p class="tiny muted" style="margin-top:9px">公开 Skill 描述当前已发布的读写边界，但不意味着存在真实 MCP 服务器或可读取用户私人内容的接口。</p></div></div></div></div>';}
function home(){
return hero()+features()+articleSection(true)+linkEntry()+'<div class="section">'+bl('一次读者交互，可以有六种不同去向','<div class="flowline"><span>打开内容</span><i>→</i><span>直接阅读 / 互动计算</span><i>或</i><span>私人阿维委托</span><i>或</i><span>提交议题 Board</span><i>→</i><span>用户选定的回执渠道</span></div><p class="small" style="margin-top:12px">不是强制漏斗：只阅读也完成了一次内容消费；讨论和委托需要用户另行确认。<a class="source-link" href="./awiki-smartmedia-blueprint-v1.html#journeys">查看分支流程总图 ↗</a></p>')+'</div>';
}
function bl(title,body){return '<div class="card"><h3>'+title+'</h3>'+body+'</div>';}
function articlePage(){return '<section class="section"><div class="eyebrow">01 · ECONOMICS × AI</div><h1>文章、来源与可持续讨论</h1><p class="lead">保留完整原文与专业表达，但可以根据不同读者目标提供阅读路线、相关证据和可获授权的互动能力。</p>'+articleSection(false)+'</section>'}
function threadCard(t,moderation=false){
const stLabel={pending:"待审核（仅本地）",draft:"已准备候选答复",replied:"演示答复已形成"}[t.status]||t.status;
return '<div class="listitem"><div class="row between">'+tag(t.role+" · "+t.id,"blue")+tag(stLabel,t.status==="replied"?"green":"gold")+'</div><h3>'+esc(t.question)+'</h3><p class="small">关联公开来源：'+esc(t.source||"未指定")+' · '+esc(t.createdAt.slice(0,10))+'</p><p class="tiny muted">可见范围：'+esc(t.visibility)+'；回执意向：'+esc(t.channel)+'（模拟）</p>'+(t.answer?'<div class="note"><b>演示回复（非侯老师正式立场）：</b>'+esc(t.answer)+'</div>':"")+(moderation?'<div class="row">'+(t.status==="pending"?bid("editor-draft-"+t.id,"运营方准备答复","sm"):t.status==="draft"?bid("editor-approve-"+t.id,"模拟批准并生成回单","sm primary"):"")+'</div>':'')+'</div>';
}
function discussionPage(){
const opts=list().map(x=>'<option value="'+esc(x.id)+'" '+(st.pendingQuestionSource===x.id?"selected":"")+'>'+esc(x.title)+'</option>').join("");
return '<section class="section"><div class="eyebrow">02 · READERS / STUDENTS / PEERS</div><h1>议题讨论与共同工件</h1><p class="lead">你可以只提交一个问题，也可以带着公开来源和材料发起讨论。问题、候选答复与作者审核分别留痕；并非每一条留言都自动变成公开 Board。</p><div class="cards2"><div class="card"><h3>发起问题 / 学生讨论 / 同行交流</h3><div class="field"><label for="disc-role">本次参与身份（自选说明）</label><select class="input" id="disc-role"><option value="读者">普通读者</option><option value="学生">学生/课堂参与者</option><option value="同行">研究同行</option><option value="合作方">专业合作方</option></select></div><div class="field"><label for="disc-source">相关公开材料</label><select class="input" id="disc-source"><option value="">不关联具体文章</option>'+opts+'</select></div><div class="field"><label for="disc-body">本次希望讨论什么？</label><textarea id="disc-body" class="input inputarea" maxlength="700" placeholder="例如：智能体互联网与企业竞争优势之间的联系，应如何衡量？"></textarea></div><div class="field"><label for="disc-channel">你希望怎样收到回复？</label><select class="input" id="disc-channel"><option value="page">当前网页（仅本浏览器可见）</option><option value="did">我的 AWiki DID 收件箱（需模拟登录）</option><option value="email">电子邮箱（仅记录掩码，未投递）</option></select></div><div class="field" id="disc-email-wrap" hidden><label for="disc-email">收件邮箱（不会发送真实邮件）</label><input class="input" id="disc-email" type="email" placeholder="you@example.com"></div><label class="check"><input type="checkbox" id="disc-consent">我确认只提交以上问题和指定公开来源，未授权读取其他私人笔记或 ChatGPT 历史。</label><div class="row" style="margin-top:13px">'+bid("disc-submit","确认提交讨论工件（模拟）","primary")+bid("open-aura","先问我的阿维","")+'</div></div><div class="card soft"><h3>不同主体如何接续？</h3><div class="flowline"><span>学生 / 读者问题</span><i>→</i><span>讨论 Board</span><i>→</i><span>数字编辑整理</span><i>→</i><span>作者审阅</span><i>→</i><span>用户收回单</span></div><div class="note" style="margin-top:18px"><b>重要：</b>作者是否公开回答由本人决定。未被批准的 AI 解释不冒充作者正式学术观点；当前演示无真实审核与服务器投递。</div><h3 style="margin-top:22px">近期公开议题建议</h3><div class="previewrow"><b>智能体互联网与平台经济</b><p>可关联公开合著文章，讨论 AI 的认知能力与互联网连接能力。</p></div><div class="previewrow"><b>Token 经济学：成本、复用与服务边际收益</b><p>是演示建议议题，并非侯老师已发表的具体论断。</p></div><div class="previewrow"><b>企业如何形成智能原生组织？</b><p>可关联已有公开讲座整理，不构成新的作者发言。</p></div></div></div><div class="section"><div class="section-head"><h2>本浏览器里生成的 Board</h2>'+tag("未提交到真实公共社区","gold")+'</div>'+(st.threads.length?st.threads.map(x=>threadCard(x)).join(""):'<div class="card"><p>暂无模拟讨论记录。提交一条问题后，可以进入“作者运营演示”查看候选整理与回应流程。</p></div>')+'</div></section>';
}
function labValues(){const l=st.lab,old=l.requests*l.cost,newc=old*(1-l.reuse/100),gross=l.requests*l.value;return {old,newc,gross,saving:old-newc,net:gross-newc};}
function labPage(){
const l=st.lab,v=labValues();
return '<section class="section"><div class="eyebrow">03 · INTERACTIVE EXPERIENCE</div><h1>学生课堂互动：Token 成本与知识复用</h1><p class="lead">把经济学问题变成可操作的假设。这里的模型是<strong>为演示制作的简单数学练习</strong>，不是侯老师正式发表的模型、统计结论或对行业的预测。</p><div class="course-model"><div class="row between"><h3>练习：如果相同问题能被复用，长期 Token 成本会怎样变化？</h3>'+tag("纯本地算式 · 0 次外部推理","green")+'</div><div class="cards2"><div class="field"><label for="lab-requests">月度服务次数：<b id="lab-requests-val">'+l.requests+'</b></label><input id="lab-requests" type="range" min="200" max="10000" step="200" value="'+l.requests+'" style="width:100%"></div><div class="field"><label for="lab-cost">单次推理成本：¥<b id="lab-cost-val">'+l.cost.toFixed(2)+'</b></label><input id="lab-cost" type="range" min="0.02" max="0.50" step="0.01" value="'+l.cost+'" style="width:100%"></div><div class="field"><label for="lab-reuse">可复用比例：<b id="lab-reuse-val">'+l.reuse+'%</b></label><input id="lab-reuse" type="range" min="0" max="95" step="5" value="'+l.reuse+'" style="width:100%"></div><div class="field"><label for="lab-value">单次服务的假设价值：¥<b id="lab-value-val">'+l.value.toFixed(2)+'</b></label><input id="lab-value" type="range" min="0.10" max="2.00" step="0.10" value="'+l.value+'" style="width:100%"></div></div><div class="course-grid" id="lab-results">'+labMetrics(v)+'</div><p class="tiny muted" style="margin-top:15px">简化公式：基础成本＝次数×单次推理成本；复用后成本＝基础成本×(1−复用比例)；价值是假设输入，未扣其他托管、人力、审核、获客成本。没有实时 Token 报价或外部推理。</p></div><div class="cards2 section"><div class="card"><h3>这次互动如何继续？</h3><p>你可以保存为个人研究（不公开参数），或只分享选定的数学结论到课堂讨论。</p><div class="row">'+bid("lab-save","存入我的私人 Matter","primary")+bid("lab-to-discussion","只把结果用于课堂提问","")+'</div></div><div class="card"><h3>让 Agent 执行更复杂的研究</h3><p>把具体数据集或文献研究委托给自己选择的专业 Agent／个人设备，需要另行限定输入、期限和回单契约。</p><div class="row">'+bid("open-aura","通过阿维委派","primary")+bid("copy-chatgpt","交给现有 ChatGPT","")+'</div></div></div></section>';
}
function labMetrics(v){return [["不复用的模型成本","¥"+v.old.toFixed(2)],["复用后的推理成本","¥"+v.newc.toFixed(2)],["假设服务价值总额","¥"+v.gross.toFixed(2)]].map(x=>'<div class="metric"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join("");}
function resourcesPage(){
return '<section class="section"><div class="eyebrow">04 · SOURCES + AGENTS</div><h1>研究资料与 Agent-ready 内容</h1><p class="lead">同一份公开文章，既能被读者正常打开，也能被外部 Agent 读取带出处的结构化摘要；但私人资料与作者的内部底稿不因此公开。</p>'+linkEntry()+'<div class="section"><div class="cards2">'+list().map(x=>'<div class="card"><span class="source-token">'+esc(x.id)+'</span><h3 style="margin-top:13px">'+esc(x.title)+'</h3><p>'+esc(x.source||"本地示范草稿")+' · '+esc(x.date)+'</p>'+(urlOk(x.url)?'<a class="source-link small" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">回到原始发布源 ↗</a>':tag("尚未对外发布","gold"))+'</div>').join("")+'</div></div><div class="card"><h3>面向 Agent 的读取说明与行动边界</h3><div class="row">'+bid("copy-skill","复制公开 Skill URL","primary")+bid("copy-chatgpt","复制给 ChatGPT")+bid("open-chatgpt","打开我的 ChatGPT ↗")+'</div><p class="small" style="margin-top:15px">当前 Skill 是可阅读的 Markdown 使用说明，JSON 是公开资料索引；它们不等于可以调用的 MCP Server，也没有提供私人账号读取权限。</p><pre class="code" style="margin-top:12px">GET '+JSON_URL+'\nGET '+SKILL_URL+'\n\n// 受保护的操作（仍为规划）\nrequest_author_conversation(...)  → 需用户确认与服务端审计\nsave_private_artifact(...)       → 需用户身份与资源授权\ndelegate_to_local_agent(...)     → 需真实执行节点和回单</pre></div></section>';
}
function servicesPage(){
return '<section class="section"><div class="eyebrow">05 · PERSONAL / INSTITUTIONAL SERVICE</div><h1>围绕专业知识建立可选择的服务关系</h1><p class="lead">智媒体不是强制售课或成交漏斗。研究论文、开放答疑和学生讨论本身可以是完整价值；确有合作需要时，才进入专业服务事项。</p><div class="cards3">'+[["学生与研究者","课堂问题、文献讨论、案例研究","参与学术讨论"],["知识与内容机构","专题共创、课程资料运营、公共知识服务","联系内容合作"],["企业与 IR 服务商","公开内容解释、行业活动、知识型智媒体服务","了解企业场景"]].map((x,i)=>'<div class="card"><span class="eyebrow">0'+(i+1)+'</span><h3>'+x[0]+'</h3><p>'+x[1]+'</p>'+bid("service-"+i,x[2],"sm primary")+'</div>').join("")+'</div><div class="section">'+bl("只做一个受限的合作请求","<p>同一条联系可能由学生、作者、专业机构或其 Agent 发起。系统应明确身份、内容、授权范围与回应路径，再由作者决定是否受理。</p><div class='row'>"+bid("tab-discussion","进入问题与请求 Board","primary")+bid("open-aura","先让我的阿维准备问题")+'</div>')+'</div></section>';
}
function inboxPage(){
return '<section class="section"><div class="eyebrow">06 · PERSONAL DID / WORKHUB</div><h1>我的收件箱与持续工作</h1><p class="lead">这是用户控制的工作对象视图，不是作者的订阅名单。文章来源、个人委托、讨论提交和回单各自标记授权范围。</p><div class="row" style="margin-bottom:14px">'+tag(st.bound?"演示 DID 已绑定":"匿名模式",st.bound?"green":"gold")+bid("bind","模拟 AWiki 身份绑定","sm")+bid("export","导出我的演示记录","sm")+bid("reset-demo","清空演示数据","sm warning")+'</div><div class="cards3"><div class="metric"><small>私人资源／研究</small><b>'+st.privateWork.length+'</b></div><div class="metric"><small>委托（待执行）</small><b>'+st.delegations.length+'</b></div><div class="metric"><small>本地回单与通知</small><b>'+st.inbox.length+'</b></div></div><div class="section"><h2>我的 Matter / Resource / Artifact</h2>'+(st.privateWork.length?st.privateWork.map(x=>'<div class="listitem"><b>'+esc(x.title)+'</b><p>'+esc(x.summary)+'</p><div class="row">'+tag(x.scope,"green")+tag(x.id,"blue")+'</div></div>').join(""):'<div class="card">暂无个人研究。你可以阅读一篇文章或做一个课堂实验，再明确选择保存。</div>')+'</div><div class="section"><h2>委托执行关系</h2>'+(st.delegations.length?st.delegations.map(x=>'<div class="listitem"><b>'+esc(x.id)+' · '+esc(x.target)+'</b><p>'+esc(x.goal)+'</p>'+tag("待外部执行节点适配，不是真实已运行","gold")+'</div>').join(""):'<div class="card">目前没有委托。阿维可创建本地／云端 Agent 的待执行请求，但这份演示并不运行外部模型。</div>')+'</div><div class="section"><h2>DID Inbox / 本地通知</h2>'+(st.inbox.length?st.inbox.map(x=>'<div class="listitem"><div class="row between"><b>'+esc(x.id||"通知")+'</b>'+tag(x.type||"receipt","blue")+'</div><p>'+esc(x.text)+'</p><span class="tiny muted">'+esc(x.time.slice(0,16).replace("T"," "))+'</span></div>').join(""):'<div class="card">暂无通知。其他真实用户的 DID/邮箱不会收到本演示的消息。</div>')+'</div></section>';
}
function editorPage(){
const drafts=st.articlesLocal.map(x=>articleCard(x)).join("");
return '<section class="section"><div class="eyebrow">07 · AUTHOR OPERATIONS / DEMO</div><h1>作者运营示意 · 只在本浏览器有效</h1><div class="alert"><b>重要：</b>此处没有真实作者身份认证。任何访问者都可以操作这个演示控制台；“模拟发布／批准”只改变当前浏览器状态，不代表侯老师签名、授予代理权或真实线上发布。</div><div class="cards2"><div class="card"><h3>文章起草与本地模拟发布</h3><div class="field"><label for="editor-title">标题（请只填演示内容）</label><input id="editor-title" class="input" placeholder="示例：智能体互联网与企业组织……" maxlength="130"></div><div class="field"><label for="editor-summary">正文导读／内容说明</label><textarea id="editor-summary" class="input inputarea" maxlength="600" placeholder="给读者的导读，显示为本地演示稿……"></textarea></div><div class="field"><label for="editor-category">分类</label><select id="editor-category" class="input"><option>AI 产业经济</option><option>智能体互联网</option><option>企业战略与组织</option><option>学术课程与教学</option></select></div><label class="check"><input type="checkbox" id="editor-confirm">我理解此操作不会公开发布到真正的网站，也不表示侯老师已经批准。</label><div class="row" style="margin-top:13px">'+bid("editor-publish","本浏览器模拟发布","primary")+'</div></div><div class="card"><h3>讨论审核与正式回应职责</h3><p>数字编辑先梳理问题和公开来源，作者有权修改、批准或不回答。未获批准的候选答案不自动对公众发布。</p><div class="flowline"><span>读者问题</span><i>→</i><span>内容整理</span><i>→</i><span>待作者确认</span><i>→</i><span>指定范围回单</span></div><div class="note" style="margin-top:14px">正式版本需要作者授权、服务端防滥用、讨论可见范围、原文编辑与撤回、审稿版本和签署记录。</div></div></div><div class="section"><h2>收到的讨论与合作请求</h2>'+(st.threads.length?st.threads.map(x=>threadCard(x,true)).join(""):'<div class="card">还没有任何本地请求。可先到“议题讨论”提交一条学生问题。</div>')+'</div><div class="section"><h2>本机示范文章</h2>'+(drafts?'<div class="cards2">'+drafts+'</div>':'<div class="card">尚无本地发布演示。</div>')+'</div></section>';
}
function auraMarkup(){
if(!st.auraOpen)return "";
const item=selected();
const contextUsed=st.privateCompute;
const scope='<div class="bubble"><h3>本次分身可见什么？</h3><p>公开来源：'+esc(item?item.id:"未选择")+'；用户 DID：'+esc(st.bound?"演示已绑定":"未绑定")+'；私人上下文：默认无权限。</p>'+tag("公开内容可读","green")+" "+tag("无真实云端数据接口","gold")+'</div>';
const cmp='<div class="bubble private"><h3>① 从 AWiki 选择局部私有上下文</h3><p>可输入一段“用户自己的研究目标”以模拟 AWiki 私域资料。这里不会发送给侯老师或外部模型。</p><textarea class="input inputarea" id="aura-private-note" maxlength="600" placeholder="例如：我正在比较企业的 AI 组织能力与多智能体经济结构……（仅在点击计算时处理）"></textarea><label class="check"><input type="checkbox" id="aura-allow-private">允许本次在浏览器本地模拟计算中使用上述私人笔记；不向本站公开原文。</label>'+bid("aura-compute","在 AWiki 私域内计算（本机模拟）","sm primary")+(contextUsed?'<div class="user-preview" style="margin-top:10px">'+esc(contextUsed.summary)+'</div>':"")+'</div>';
const write='<div class="bubble"><h3>② 把结果写回用户自己的 WorkHub</h3><p>只保存选定的结果与公开来源引用；不自动把本人的私人研究发到网站。</p>'+bid("aura-save","保存用户侧 Artifact / Receipt","sm primary")+'</div>';
const send='<div class="bubble"><h3>③ 将选定结果发送／抄送到哪里？</h3><div class="field"><label for="aura-channel">发送目标</label><select class="input" id="aura-channel"><option value="self">当前网页用户 / 本人的 Inbox</option><option value="discussion">作者讨论 Board（需另行共享）</option><option value="other">其他用户 DID / Handle</option><option value="email">邮箱（仅模拟准备，不发送）</option></select></div><div class="field"><label for="aura-recipient">目标 DID／邮箱（可选；选择他人时必填）</label><input id="aura-recipient" class="input" placeholder="did:example:... / person@example.com"></div><div class="field"><label for="aura-cc">抄送（可选；仅模拟）</label><input id="aura-cc" class="input" placeholder="其他 DID / 邮箱；需要单独授权"></div><div class="row">'+bid("aura-preview-send","预览共享与回执","sm")+ (st.deliveryDraft?bid("aura-confirm-send","确认创建发送记录（模拟）","sm primary"):"")+'</div>'+(st.deliveryDraft?'<div class="user-preview" style="margin-top:10px">'+esc(st.deliveryDraft.preview)+'</div>':"")+'</div>';
const delegate='<div class="bubble"><h3>④ 把执行委托给我的其他 Agent／设备</h3><p>可创建本地电脑、个人云端 Agent 或 ChatGPT 的待执行请求。正式 ACP、MYA／OVAIM、MCP 和事件适配尚未实现。</p><div class="row">'+bid("aura-delegate-local","委托本地节点","sm")+bid("aura-delegate-cloud","委托自有云 Agent","sm")+bid("copy-chatgpt","交给 ChatGPT","sm")+'</div></div>';
return '<aside class="aura" aria-label="私人阿维即时分身"><div class="aura-head"><div class="row"><span class="aura-logo">✦</span><div><strong>我的阿维 AURA</strong><small>当前网页的受限私人分身</small></div></div>'+bid("close-aura","收起","sm")+'</div><div class="aura-body">'+scope+cmp+write+send+delegate+'</div><div class="aura-footer"><p>独立站只接收用户明确共享的最小数据。当前演示计算在浏览器执行；正式云端或第三方模型须说明实际数据出域情况。</p></div></aside>';
}
function footer(){return '<footer class="footer"><div class="limit"><div class="row between"><div><b>AWiki · Smart Media</b><p>内容是入口，互动是使用，委托是工作，Board 是共同确认；用户自己的数据与权利不应被单一 Agent 平台锁定。</p></div><div class="row"><a href="./awiki-smartmedia-blueprint-v1.html">商业模式与分支流程图 ↗</a><a href="./awiki-ir-demo-hub-v2.html">香港 IR 四端样例 ↗</a></div></div><div class="tiny" style="color:#83a5aa">概念展示 · 非侯老师本人官方站点 · 所有互动均为本浏览器模拟，真实部署须取得作者与机构授权。</div></div></footer>';}
function drawQR(){const canvas=document.getElementById("site-qr");if(!canvas||!canvas.getContext)return;const ctx=canvas.getContext("2d"),n=QR_GRID.size,raw=atob(QR_GRID.data);ctx.fillStyle="#fff";ctx.fillRect(0,0,n*4,n*4);ctx.fillStyle="#17444d";for(let i=0;i<n*n;i++){if(raw.charCodeAt(i>>3)&(1<<(7-(i%8))))ctx.fillRect((i%n)*4,Math.floor(i/n)*4,4,4);}}
function render(){
const container=document.getElementById("app");if(!container)return;
const page={home,articles:articlePage,discussion:discussionPage,lab:labPage,resources:resourcesPage,services:servicesPage,inbox:inboxPage,editor:editorPage}[st.tab]||home;
const html=nav()+'<div class="limit"><div class="site-layout '+(st.auraOpen?"aura-open":"")+'"><main class="content-panel">'+page()+'</main>'+auraMarkup()+'</div></div>'+footer()+(st.auraOpen?"":'<button type="button" class="right-invoke" data-act="open-aura">✦ 唤起我的阿维</button>');
container.innerHTML=html;
drawQR();
document.title="侯宏老师 · AI × 经济学智媒体（非官方产品演示）";
}
function goTab(tab){if(!menu.some(x=>x[0]===tab))return;st.tab=tab;save();window.scrollTo({top:0,behavior:"smooth"});}
function addDiscussion({role,source,question,channel,emailMasked="",visibility="仅本次讨论与运营模拟"}){const id="BOARD-"+st.seq++;st.threads.unshift({id,role,source,question,channel,emailMasked,visibility,status:"pending",createdAt:now(),events:[{at:now(),actor:role,kind:"创建拟讨论事项",text:"仅在当前浏览器保存的演示记录。"}],answer:""});st.inbox.unshift({id:"IN-"+st.seq++,text:"已准备讨论 "+id+"，等待演示编辑审阅；未发送给真实作者。",time:now(),type:"board"});return id;}
function discussionSubmit(){const question=document.getElementById("disc-body")?.value?.trim()||"";if(question.length<12){toast("请说明一个具体的问题，至少 12 个字");return;}
const role=document.getElementById("disc-role").value,source=document.getElementById("disc-source").value,channel=document.getElementById("disc-channel").value;
if(!document.getElementById("disc-consent")?.checked){toast("请先确认你主动共享的范围");return;}
if(channel==="did"&&!needBind())return;
let mask="";
if(channel==="email"){const mail=document.getElementById("disc-email")?.value?.trim()||"";if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){toast("请输入有效格式的邮箱（演示不会投递）");return;}mask=maskEmail(mail);}
const id=addDiscussion({role,source,question,channel,emailMasked:mask});st.pendingQuestionSource=null;save();toast("讨论 "+id+" 已写入本地演示 Board，没有发送给作者");}
function editorPublish(){const t=document.getElementById("editor-title")?.value?.trim()||"",summary=document.getElementById("editor-summary")?.value?.trim()||"",category=document.getElementById("editor-category")?.value||"AI 经济学";
if(t.length<5||summary.length<12){toast("请输入完整的演示标题和导读");return;}if(!document.getElementById("editor-confirm")?.checked){toast("请确认这不是侯老师真实的公开发布");return;}
const id="LOCAL-DRAFT-"+st.seq++;st.articlesLocal.unshift({id,title:t,kind:"本站本地编辑模拟",date:now().slice(0,10),authors:["演示编辑操作（未经作者授权）"],source:"当前浏览器 localStorage",url:null,topics:[category],summary,status:"local-only",questions:["该议题的核心论证是什么？","怎样核对相关证据？"]});save();toast("演示文章已出现在本浏览器列表，但未公开发布");}
function replyDraft(id){const q=st.threads.find(x=>x.id===id);if(!q||q.status!=="pending")return;q.status="draft";q.answer="运营助手整理的候选答复：已收到你的问题，可先参考所选公开原文核对概念与证据。此答复尚未获任何真实作者批准。";q.events.push({at:now(),actor:"数字编辑（演示）",kind:"候选答复",text:"准备公开原文链接，等待作者本人审核。"});save();}
function replyApprove(id){const q=st.threads.find(x=>x.id===id);if(!q||q.status!=="draft")return;q.status="replied";q.answer+="【本地模拟审核完成，不是侯宏老师的真实发言或回复。】";q.events.push({at:now(),actor:"模拟运营角色",kind:"生成回应记录",text:"仅创建当前浏览器的演示回单，没有外部邮件、DID 或公开系统发送。"});if(q.channel==="did"&&st.bound)st.inbox.unshift({id:"IN-"+st.seq++,time:now(),text:"讨论 "+q.id+" 产生本地模拟回复，可回到议题页查看。",type:"did-receipt"});if(q.channel==="email")q.deliveryStatus="email_prepared_not_sent";save();}
function auraCompute(){
if(!needBind())return;
const el=document.getElementById("aura-private-note");const allow=document.getElementById("aura-allow-private")?.checked;
const raw=el?.value?.trim()||"";if(raw&&!allow){toast("你填写了私人笔记，请先明确允许本次使用；或者清空内容");return;}
const source=selected();const title=source?source.title:"AI与经济学";
const sum="已在当前浏览器模拟 AWiki 私域处理。公开引用："+(source?source.id:"无")+"；"+(allow&&raw?"使用你明确选定的 "+raw.length+" 字私人输入（不回显原文，不存储原文）。":"未使用任何私人输入。")+" 推荐继续围绕《"+title+"》核对正式来源，决定是否保存个人研究或提交有范围的讨论摘要。";
st.privateCompute={summary:sum,sourceId:source?.id||"",privateUsed:Boolean(allow&&raw),privateChars:allow?raw.length:0,time:now()};st.deliveryDraft=null;save();toast("私域计算演示完成；没有调用外部模型或网站后台");}
function savePrivate(type){
if(!needBind())return;
const source=selected();const info=st.privateCompute;
const title=type==="lab"?"课堂 Token 成本情景模拟":source?"围绕《"+source.title+"》的私人研究引用":"我的智能媒体研究";
const summary=type==="lab"?"演示条件：服务次数 "+st.lab.requests+"、单次成本 ¥"+st.lab.cost+"、复用 "+st.lab.reuse+"%；结果为纯数学练习。":info?.summary||"已选公开来源 "+(source?.id||"无")+"；未额外导入或发送私人内容。";
const id="MATTER-"+st.seq++;st.privateWork.unshift({id,title,summary,scope:"用户侧私人工作 · 未共享给作者",source:source?.id||"",at:now()});st.inbox.unshift({id:"IN-"+st.seq++,type:"private-receipt",time:now(),text:id+" 已在本浏览器模拟 WorkHub 中保存；不同真实设备尚未同步。"});save();toast("已模拟保存到私人 WorkHub："+id);}
function delegateTo(kind){
if(!needBind())return;
const id="DLG-"+st.seq++,source=selected()?.id||"public media";
const target=kind==="local"?"用户自己电脑上的本地 Agent / ACP":"用户自己的云端 Agent / 外部 Personal Agent";
st.delegations.unshift({id,target,goal:"基于 "+source+" 的可核对研究；先仅分享公开来源，不发送其他私人上下文。",status:"pending-adapter",at:now()});
st.inbox.unshift({id:"IN-"+st.seq++,type:"delegation",time:now(),text:id+" 已准备委托 "+target+"；需要真实设备绑定、执行器与授权适配方可运行。"});save();toast("只建立待委托记录：未连接或运行任何外部 Agent");}
function prepareShare(){
if(!needBind())return;
const target=document.getElementById("aura-channel")?.value||"self",address=document.getElementById("aura-recipient")?.value?.trim()||"",cc=document.getElementById("aura-cc")?.value?.trim()||"";
if(target==="other"&&!/^(did:|@)[^\s]+$/.test(address)){toast("其他用户需填写 DID 或 @Handle 形式的目标");return;}
if(target==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){toast("请输入邮箱格式，演示不会真正发信");return;}
if(cc&&!/^(did:|@)[^\s]+$/.test(cc)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc)){toast("抄送地址需为 DID、@Handle 或邮箱格式");return;}
const summary=st.privateCompute?.summary||"本人针对所选公开资料的研究摘要（未导入个人私人笔记原文）。";
const receiver=target==="self"?"本人 DID Inbox":target==="discussion"?"作者讨论 Board":target==="other"?address:maskEmail(address);
st.deliveryDraft={target,addressMasked:target==="email"?maskEmail(address):target==="other"?address:"",ccMasked:cc.includes("@")&&!cc.startsWith("@")?maskEmail(cc):cc,summary,preview:"拟发送对象："+receiver+"\n"+(cc?"抄送："+(cc.includes("@")&&!cc.startsWith("@")?maskEmail(cc):cc)+"\n":"")+"内容（摘要/来源）："+summary+"\n状态：仅准备发件内容，等待你再次确认。"};
save();toast("已生成发送预览，尚未向外部投递");}
function confirmShare(){
if(!needBind()||!st.deliveryDraft){toast("没有需要确认的内容");return;}
const o=st.deliveryDraft,id="OUT-"+st.seq++;
st.outgoing.unshift({id,target:o.target,receiver:o.addressMasked,cc:o.ccMasked,summary:o.summary,status:o.target==="self"?"browser_local_receipt":"prepared_not_delivered",at:now()});
if(o.target==="self"){
st.inbox.unshift({id:"IN-"+st.seq++,type:"self-delivery",time:now(),text:"已在本浏览器的私人 Inbox 创建 "+id+" 回单；没有真实网络投递。"});
}
if(o.target==="discussion"){addDiscussion({role:"用户阿维（演示）",source:st.privateCompute?.sourceId||"",question:o.summary.slice(0,500),channel:"page",visibility:"仅选定研究摘要；未分享私有原文"});}
st.deliveryDraft=null;save();toast("发送记录 "+id+" 已准备；其他收件人／邮箱未收到任何消息");}
function exportWork(){const body={demo_only:true,exported:now(),work:st.privateWork,delegations:st.delegations,inbox:st.inbox,outgoing:st.outgoing,threads:st.threads,local_drafts:st.articlesLocal};const blob=new Blob([JSON.stringify(body,null,2)],{type:"application/json;charset=utf-8"});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="awiki-hou-demo-private-work.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
function handleAction(a){
if(a.startsWith("tab-")){goTab(a.slice(4));return;}
if(a==="bind"){bind();return;}if(a==="open-aura"){st.auraOpen=true;save();toast("已唤起受限阿维分身（本地模拟）");return;}if(a==="close-aura"){st.auraOpen=false;save();return;}
if(a==="copy-chatgpt"){copy(prompt());return;}if(a==="copy-url"){copy(PAGE_URL);return;}if(a==="copy-skill"){copy(SKILL_URL);return;}if(a==="open-chatgpt"){openChatGPT();return;}
if(a.startsWith("article-")){st.selectedArticle=a.slice(8);st.tab="articles";save();return;}
if(a.startsWith("discussion-source-")){st.pendingQuestionSource=a.slice(18);st.tab="discussion";save();return;}
if(a==="disc-submit"){discussionSubmit();return;}if(a==="editor-publish"){editorPublish();return;}
if(a.startsWith("editor-draft-")){replyDraft(a.slice(13));return;}if(a.startsWith("editor-approve-")){replyApprove(a.slice(15));return;}
if(a==="aura-compute"){auraCompute();return;}if(a==="aura-save"||a==="aura-save-public"){if(a==="aura-save-public"){st.auraOpen=true;}savePrivate("source");return;}
if(a==="lab-save"){savePrivate("lab");return;}if(a==="lab-to-discussion"){st.pendingQuestionSource=selected()?.id||"";st.tab="discussion";save();toast("请选择要分享的结论后提交，私人参数不会自动公开");return;}
if(a==="aura-preview-send"){prepareShare();return;}if(a==="aura-confirm-send"){confirmShare();return;}
if(a==="aura-delegate-local"){delegateTo("local");return;}if(a==="aura-delegate-cloud"){delegateTo("cloud");return;}
if(a==="export"){exportWork();return;}
if(a==="reset-demo"){if(!confirm("只清除当前浏览器的演示内容、委托和回单？不会影响真正 AWiki 或文章源站。"))return;st=base();save();toast("本地演示已重置");return;}
if(a.startsWith("service-")){st.tab="discussion";save();toast("请在讨论表单中选择“合作方”，说明具体服务意向；当前仅为本地模拟");return;}
toast("此操作仅展示产品能力说明，未连接后端。");
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)handleAction(b.dataset.act);const n=e.target.closest("[data-tab]");if(n)goTab(n.dataset.tab);});
document.addEventListener("change",e=>{if(e.target.id==="disc-channel"){let node=document.getElementById("disc-email-wrap");if(node)node.hidden=e.target.value!=="email";}});
document.addEventListener("input",e=>{
if(!e.target.id.startsWith("lab-"))return;
const key=e.target.id.slice(4);
if(!Object.prototype.hasOwnProperty.call(st.lab,key))return;
st.lab[key]=Number(e.target.value);
const label=document.getElementById(e.target.id+"-val");if(label)label.textContent=key==="cost"||key==="value"?st.lab[key].toFixed(2):String(st.lab[key]);
const m=document.getElementById("lab-results");if(m)m.innerHTML=labMetrics(labValues());save(false);
});
async function loadPublic(){
try{
const response=await fetch("./awiki-hou-smartmedia-public-v1.json",{cache:"no-store"});
if(!response.ok)throw new Error("HTTP "+response.status);
const obj=await response.json();
if(!obj.demo||!Array.isArray(obj.content))throw new Error("非预期公开数据");
publicData=obj;
if(!st.selectedArticle&&obj.content.length)st.selectedArticle=obj.content[0].id;
}catch(e){publicData={content:[]};toast("公开文章索引暂时无法加载："+String(e.message||e));}
render();
}
render();
loadPublic();
})();
