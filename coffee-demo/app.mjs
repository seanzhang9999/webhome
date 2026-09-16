import {events,groups,actors,docs} from './scenario.mjs';
import {portuguese,partnerRecommendations} from './translations.mjs';
import {initial,pending,activeGroup,reduce,restore} from './engine.mjs';
const KEY='awiki.coffee-network.v1';
let reviewing=false;
let state;let storageWarning=false;
try{state=restore(localStorage.getItem(KEY));}catch{state=initial();storageWarning=true;}
let view='work',workTab='matters',search='',objectIndex=0,overviewTab='inbox',connectionTab='people',discoveryTab='communities',sessionIndex=0,selected=activeGroup(state),modal=null,playing=false,timer=null,notice='';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,cls='',attrs='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${text}</button>`;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageWarning=true;}}
function stop(){playing=false;clearTimeout(timer);}
function dispatch(command){
 const old=state;state=reduce(state,command);
 if(state===old){notice=pending(state)?'请先审阅右侧AI伙伴的建议与决定草稿。推进键不能代替人的批准。':'当前已暂停或撤回，请查看状态。';}
 else{notice='';selected=activeGroup(state);save();}
 if(pending(state)||state.paused||state.cursor===events.length-1)stop();
 render();
}
function play(){
 if(playing){stop();render();return;}
 if((view!=='work'||workTab!=='matters')||pending(state)||state.paused||selected!==activeGroup(state)||state.cursor===events.length-1){notice='当前需要人处理，自动播放不会跨过这个关口。';render();return;}
 playing=true;render();tick();
}
function tick(){timer=setTimeout(()=>{if(!playing)return;dispatch('next');if(playing)tick();},2100);}
function message(e,index){
 const a=actors[e.actor];
 return `<article class="msg ${a.kind==='me'?'me-msg':''}" id="event-${index}"><span class="avatar ${a.kind}">${a.mark}</span><div><div class="msg-meta"><b>${a.name}</b><span>${a.role}</span><time>${e.time}</time></div><div class="bubble ${e.risk?'risk-bubble':''}"><strong>${e.title}</strong>${portuguese[e.id]?`<div class="original-text" lang="pt-BR"><span class="language-label">Português · 原文</span><p>${portuguese[e.id].original}</p></div><div class="translation-text" lang="zh-CN"><span class="language-label">中文翻译</span><p>${portuguese[e.id].translation}</p></div>`:`<p>${e.text}</p>`}${e.doc?`<button class="attachment" data-doc="${e.doc}"><span>▤</span> ${docs[e.doc][0]} <span>↗</span></button>`:''}</div><div class="message-proof">${e.id} · ${e.actor==='system'?'模拟系统事件':a.kind==='agent'?'模拟智能体消息':'预置演示消息'}${e.night?' · 夜间授权范围内':''}</div></div></article>`;
}
function decisionReceipt(i){return `<article class="msg me-msg"><span class="avatar me">${events[i].actor==='finance'?'周':'岚'}</span><div><div class="msg-meta"><b>${events[i].actor==='finance'?'周敏 · 财务授权岗':'林岚 · 采购负责人'}</b><span>人员确认 · 本地演示</span></div><div class="bubble approved"><strong>✓ ${events[i].gate.label}</strong><p>${events[i].gate.decision}</p></div><div class="message-proof">DEC-${i+1} · 来源 ${events[i].id} · 明确点击确认</div></div></article>`;}
function gateCard(){
 const e=events[state.cursor];
 if(state.revoked)return `<div class="gate-card"><span class="pill warn">委托已撤回</span><h3>所有后续模拟任务已停止</h3><p>历史记录保留。要重新演示，请在设置中完整重置。</p>${button('打开设置','settings')}</div>`;
 if(state.paused)return `<div class="gate-card"><span class="pill warn">人工暂停</span><h3>未新增消息、未扩大授权</h3><p>当前事项保持原状，恢复后仍需逐个确认未决关口。</p>${button('恢复演示','resume','primary')}</div>`;
 if(pending(state))return `<section class="gate-card" aria-label="当前人员决定"><div class="eyebrow">待你决定 · ${e.actor==='finance'?'模拟财务授权岗':'采购负责人'}</div><h3>${e.gate.label}</h3><details class="decision-draft" ${reviewing?'open':''}><summary>查看待写回的决定草稿</summary><p>${e.gate.decision}</p></details><div class="card-actions">${button(reviewing?'确认并写回事项':'审阅决定草稿',reviewing?'approve':'review','primary')}${button('暂不推进','pause')}</div><small>你的确认才会写回事项；N只推进模拟事件。</small></section>`;
 if(state.cursor===events.length-1)return `<section class="gate-card complete"><span class="pill ok">本单演示已完成</span><h3>从一个采购意愿，到一条完整证据链</h3><p>39个事件、7次人员确认。下一轮采购仍须重新委托。</p>${button('查看复盘回单','review-receipt','primary')}${button('重新演示','reset')}</section>`;
 return `<div class="next-cue"><span class="pulse"></span><span>下一条：${esc(events[state.cursor+1].title)}</span>${button('继续 <kbd>N</kbd>','next')}</div>`;
}
function workObjects(){
 if(workTab==='matters')return groups.map(g=>({title:g.name,sub:g.sub,mark:g.mark,group:g.id,locked:g.id>activeGroup(state)}));
 if(workTab==='resources')return [...new Set(events.slice(0,state.cursor+1).filter(e=>e.doc).map(e=>e.doc))].map(id=>({title:docs[id][0],sub:'来自事项的材料与回单',mark:'文',doc:id}));
 if(workTab==='topics')return [{title:'跨时区采购协作',sub:'持续积累委托、交接与例外经验',mark:'时',topic:0},{title:'咖啡进口单证与履约',sub:'持续跟踪批次、单证和专业复核',mark:'关',topic:1}];
 return [{title:'咖啡进口协同',sub:'已安装 · 事项模板 / 专业能力 / 运行规则',mark:'方',solution:true}];
}
function sidebar(){
 const names={matters:'事项',resources:'资源',topics:'专题',solutions:'方案'};
 return '<aside class="list"><div class="title"><h2>工作</h2><p>默认进入事项；不同对象横向切换</p></div><div class="tabs">'+Object.entries(names).map(([id,t])=>'<button class="'+(workTab===id?'on':'')+'" data-work-tab="'+id+'">'+t+'</button>').join('')+'</div><label class="search">⌕ <input id="objectSearch" aria-label="搜索'+names[workTab]+'" placeholder="搜索'+names[workTab]+'" value="'+esc(search)+'"></label><div class="items">'+workObjects().map((x,i)=>'<button class="item '+((workTab==='matters'?selected===x.group:objectIndex===i)?'on':'')+'" data-object="'+i+'" data-searchable="'+esc(x.title+' '+x.sub)+'" '+(x.locked?'disabled':'')+'><span class="mark">'+(x.locked?'锁':x.mark)+'</span><span class="copy"><b>'+x.title+'</b><span>'+x.sub+'</span></span><time>'+(workTab==='matters'?(x.locked?'待上游回单':x.group<activeGroup(state)?'已接续':pending(state)?'待确认':'办理中'):'›')+'</time></button>').join('')+'</div><div class="list-note">'+(workTab==='matters'?'事项承载持续办理；后续事项由上游决定与回单解锁。':workTab==='resources'?'仅列当前事项已出现的资料，保留来源。':workTab==='topics'?'专题组织跨事项的持续关注，不作为单笔业务进度。':'方案是已安装的可复用能力包，配置模板、能力和业务规则。')+'</div></aside>';
}
function groupStatus(){
 if(state.paused||state.revoked)return '<div class="next-cue">'+(state.revoked?'委托已撤回':'当前已暂停')+' · 请在右侧伙伴中查看状态</div>';
 if(pending(state))return '<div class="next-cue">✦ 伙伴已在右侧整理建议，等待你决定。确认后会写回本群。</div>';
 if(state.cursor===events.length-1)return '<div class="next-cue">✓ 本单已完成 · 查看工作资源与复盘回单</div>';
 return '<div class="next-cue"><span class="pulse"></span><span>下一条：'+esc(events[state.cursor+1].title)+'</span>'+button('继续 <kbd>N</kbd>','next')+'</div>';
}

function partner(){
 const historical=selected!==activeGroup(state);
 const past=events.slice(0,state.cursor+1).filter(e=>e.group===selected);
 const lastInsight=selected===activeGroup(state)&&pending(state)?events[state.cursor]:[...past].reverse().find(e=>e.insight);
 const inMatter=view==='work'&&workTab==='matters';
 const objectName=view==='work'?(workObjects()[objectIndex]?.title||'工作'):(auxiliaryData()[objectIndex]?.title||'设置');
 const contextTitle=inMatter?groups[selected].name:objectName;
 const objectAdvice=view==='messages'?'这是普通会话。需要持续办理的内容，可关联到采购事项，不能从会话留言推定业务授权。':view==='overview'?'这里汇总新输入、动态与待处理。先打开来源事项，我再结合证据帮你整理决定。':view==='connections'?'这里查看人员、群组、智能体和服务关系。连接本身不授予任何事项权限。':view==='awiki'?'这里发现外部知识与能力。方案安装后进入工作，具体调用仍要取得事项授权。':view==='settings'?'基础设置与咖啡进口服务包配置分别查看。暂停、撤回与重置仅影响本次演示。':workTab==='resources'?'这份资料来自当前已出现的事项消息。可以回到来源核对作者、时间和采用范围。':workTab==='topics'?'专题持续积累跨事项知识。我可以帮助理解已有材料，不把专题当成单笔订单的执行进度。':'这是已安装的咖啡进口方案包，为伙伴与事项提供模板、专业能力和运行规则。';
 const e=events[state.cursor];
 return `<aside class="partner"><header class="partner-head"><div class="partner-id"><i>✦</i><span><b>林岚的 AI 伙伴</b><small>私人工作面 · 不作为群成员发言</small></span></div><span class="pill purple">预设</span></header><div class="partner-body"><div class="context"><span class="eyebrow">${historical?'回看上下文':'当前关注'}</span><h3>${contextTitle}</h3><p>${!inMatter?objectAdvice:historical?'你正在回看已发生的协作记录，不能在此推进当前事项。':'群里持续办事，我帮你看清证据、边界和需要拍板的地方。'}</p></div><div class="partner-message"><div class="partner-spark">✦</div><div><span class="private-label">只对你可见</span><h3>${historical?'这段协作留下了什么':e.night?'企业在值班，你可以离线':state.cursor>=8&&state.cursor<=9?'早上好，昨晚有这些进展':'我的判断与建议'}</h3><p>${!inMatter?objectAdvice:(!historical&&pending(state)?partnerRecommendations[e.id]:null)||lastInsight?.insight||(selected===1?'现在进入双方正式洽谈。建议先把质量、数量、价格、保险和付款做成同一版本，再交人复核与批准。':selected===2?'已签合同接续到履约。每个岗位只获得任务所需信息；批准、实际执行和外部结果是不同事件。':'你希望进口一柜生豆。我建议先让撮合方明确共享范围与夜间授权，再让网络去找合适的候选。内部评估上限USD 5.30/kg留在这里，不能随采购卡对外披露。')}</p>${inMatter&&lastInsight?`<button class="source-link" data-source="${events.indexOf(lastInsight)}">依据：${lastInsight.id} · ${lastInsight.time} ↗</button>`:''}</div></div>${inMatter&&!historical&&(pending(state)||state.paused||state.revoked||state.cursor===events.length-1)?gateCard():''}<section class="context boundary"><h3>当前授权状态</h3><p>${state.revoked?'已撤回 · 不再推进':state.paused?'人工暂停 · 保留历史':state.cursor<2?'等待M01确认':state.cursor<9?'M01 · 仅资料沟通，不作承诺':state.cursor<14?'M02 · 核验与询样，不作采购承诺':state.cursor<23?'正式洽谈 · 签约另行批准':'履约 · 按各岗权限处理'}</p><small>每个新决定都必须在主对话留痕。</small></section>${state.notes.filter(n=>n.kind==='private'&&n.group===selected).map(n=>`<div class="partner-card"><b>你的私人备注</b><p>${esc(n.text)}</p><small>已保存；预设伙伴不会将自由输入当作授权。</small></div>`).join('')}</div><footer class="partner-foot"><form data-form="private"><label class="sr-only" for="privateInput">私人备注</label><div class="composer-box"><input id="privateInput" maxlength="1000" placeholder="给伙伴留一条私人备注…"><button class="btn" type="submit">保存</button></div></form><small>本地预设演示 · 非实时大模型对话</small></footer></aside>`;
}
function conversation(){
 const historical=selected!==activeGroup(state);const g=groups[selected];
 return `<div class="three">${sidebar()}<main class="chat"><header class="chat-head"><div class="head-row"><div><div class="eyebrow">MATTER ${String(selected+1).padStart(2,'0')} / 03</div><h2>${g.name}</h2><p>${g.scope}</p></div>${button('参与者 · '+g.members.length,'members')}</div><div class="head-meta"><span class="pill ${pending(state)?'warn':'ok'}">${historical?'历史回看':state.paused?'已停止':pending(state)?'等待人决定':'协作进行中'}</span><span class="muted">${g.handoff}</span></div><div class="member-strip" aria-label="本群参与者">${g.members.map(id=>`<button data-action="members" title="${actors[id].role}"><span class="avatar ${actors[id].kind}">${actors[id].mark}</span><span>${actors[id].name}</span></button>`).join('')}</div></header><div class="chat-body"><div class="timeline"><div class="stage">全部人物 / 企业 / 报价 / 回执均为虚构演示</div>${events.slice(0,state.cursor+1).map((e,i)=>e.group===selected?`${e.chapter?`<div class="chapter"><span>${e.chapter}</span></div>`:''}${e.night&&(i===2)?'<div class="night-strip">☾ 厦门已下班 · 圣保罗开始工作<br><small>跨时区继续沟通，商业承诺仍等人确认</small></div>':''}${message(e,i)}${state.decisions.includes(i)?decisionReceipt(i):''}`:'').join('')}${state.notes.filter(n=>n.kind==='group'&&n.group===selected).map(n=>`<article class="msg me-msg"><span class="avatar me">岚</span><div><div class="msg-meta"><b>林岚</b><span>演示留言 · 不改变授权</span></div><div class="bubble"><p>${esc(n.text)}</p></div></div></article>`).join('')}${historical?`<div class="next-cue">历史群只读 ${button('回到当前事项','current','primary')}</div>`:groupStatus()}</div></div><footer class="composer"><form data-form="group"><div class="composer-box"><label class="sr-only" for="groupInput">群内演示留言</label><input id="groupInput" maxlength="1000" placeholder="在主群聊留下演示备注…" ${historical?'disabled':''}><button class="btn" type="submit" ${historical?'disabled':''}>发送留言</button></div></form><small>只保存本地留言；业务决定由右侧伙伴协助审阅，确认后写回。</small></footer></main>${partner()}</div>`;
}
const sources=[['厦门咖啡产业背景 · 福建省政府','https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/flsxkmh/202604/t20260408_7120291.htm'],['厦门自贸片区建设规定 · 厦门人大','https://www.xmrd.gov.cn/xwzx/qwfb/202408/t20240830_5599071.htm'],['进口食品合格评定 · 海关办事指南','https://online.customs.gov.cn/static/pages/guides/000629009001/000629009001.html'],['第280号令 · 商务部转载','https://is.mofcom.gov.cn/zcfb/art/2026/art_5fb27bef1cf84bbcb06e0b061201a288.html'],['中国国际贸易单一窗口','https://g.singlewindow.cn/']];
function secondary(){
 const labels={overview:'工作一览',connections:'协作网络',awiki:'AWiki · 贸易能力空间',solutions:'咖啡进口协同方案',settings:'演示设置'};
 let body='';
 if(view==='overview')body=`<div class="editorial-title"><span class="eyebrow">FROM INTENT TO DELIVERY</span><h1>让企业的每一次委托，<br>都有接续、有边界、有结果。</h1><p>厦门咖啡进口 · 智能体网络协作示范</p></div><div class="metric-row"><div><b>${state.cursor+1}<small> / ${events.length}</small></b><span>已呈现的业务事件</span></div><div><b>${state.decisions.length}<small> / 7</small></b><span>已明确确认的决定</span></div><div><b>${state.cursor>=6?'1':'0'}</b><span>已记录的越权拦截</span></div></div><p class="muted">以上仅为本次虚构演示计数，不是试点成效或实际交易统计。</p><div class="grid">${groups.map(g=>`<article class="tile"><span class="eyebrow">0${g.id+1}</span><h3>${g.name}</h3><p>${g.handoff}</p>${button(g.id<=activeGroup(state)?'查看来源群聊':'等待上游决定',`group-${g.id}`,'',g.id>activeGroup(state)?'disabled':'')}</article>`).join('')}<article class="tile"><h3>面向厦门的试点建议</h3><p>从自愿参与的进口企业、撮合机构、货代与关务服务商开始，连接既有业务系统，保留企业决策和专业责任。</p><p>先建基线，再评估首响时长、人工处理时间、单证一次通过率和授权留痕完整率。</p></article></div><h2>最近发生</h2>${events.slice(Math.max(0,state.cursor-4),state.cursor+1).reverse().map(e=>`<button class="activity" data-source="${events.indexOf(e)}"><span>${e.time}</span><b>${e.title}</b><small>${actors[e.actor].name} ↗</small></button>`).join('')}`;
 if(view==='connections')body=`<span class="eyebrow">AGENT NETWORK · ACCOUNTABLE BY DESIGN</span><h1>每个智能体都有所属方，<br>每份任务都有授权边界。</h1><div class="network-map"><div>厦门进口企业<br><b>林岚 + 企业值班 / 采购Agent</b></div><span>⇄ 授权意愿与证据 ⇄</span><div>咖啡贸易空间<br><b>撮合智能体 + 核验服务</b></div><span>⇄ 最小必要信息 ⇄</span><div>巴西供货企业<br><b>Marina + 销售Agent</b></div></div><div class="grid">${[['人的私人伙伴','只向本人提供摘要、判断和草稿；不以本人名义自动发言。'],['企业执行智能体','接受明确委托，在授权期限和范围内持续沟通；例外必须回到人。'],['专业服务机构','关务、合同、财务与品控各有负责人，提供专业复核与回单。'],['法定业务系统','单一窗口、海关、银行等由授权人员办理。此Demo均为模拟回执。']].map(([t,p])=>`<article class="tile"><h3>${t}</h3><p>${p}</p></article>`).join('')}</div>${button('查看履约共享边界','permissions','primary')}`;
 if(view==='work'&&workTab==='solutions')body=`<span class="pill">已选择 · 咖啡进口协同</span><h1>三个人机混合群，<br>一条连续的贸易链。</h1><p>方案为伙伴和事项提供可复用的专业能力。伙伴提出建议、你确认决定，事项群承接执行和回单。</p><div class="solution-path">${groups.map((g,i)=>`<article><span>0${i+1}</span><div><h2>${g.name}</h2><p>${g.sub}</p><small>${g.handoff}</small></div></article>`).join('')}</div><div class="tile"><h3>方案包 · 模板与能力</h3><p>三类事项模板：采购撮合、正式洽谈、进口履约。专业能力：受托值班、撮合、核验、合同复核、单证核对。运行规则：信息共享范围、有效期、人员决策门与回单接续。</p><h3>建议的8–10分钟讲解顺序</h3><p>意愿和授权（1分钟） → 夜间接力及拦截（2分钟） → 晨报与正式谈决定（2分钟） → 条款和签署（2分钟） → 单证异常与进口履约（3分钟）。</p><p>按N逐条揭示消息；自动播放也会在7个人员决定处停下。完整方案说明含研究来源、职责与试点建议。</p><a class="btn" href="awiki-coffee-import-design.html" target="_blank" rel="noopener">打开完整方案 ↗</a></div>`;
 if(view==='awiki')body=`<span class="eyebrow">CAPABILITY SPACE · CONCEPT DEMO</span><h1>连接能力，也连接责任。</h1><p>本页展示可组合的角色与服务，不表示已经连接真实服务商或政府系统。</p><div class="grid">${[['跨境撮合','让需求对接候选，并持续补齐双方信息缺口。'],['贸易核验','提供主体、批次及供货材料核验的证据，不保证成交。'],['进口关务协同','按现行商品和国别规则进行专业复核，组织申报材料。'],['港航与仓储','从装运计划到验收回单，把异常送到负责的人。']].map(([t,p])=>`<article class="tile"><span class="pill gray">方案角色 · 未真实连接</span><h3>${t}</h3><p>${p}</p>${button('查看责任关系','connections')}</article>`).join('')}</div><h2>研究与业务依据</h2>${sources.map(([t,u])=>`<p><a href="${u}" target="_blank" rel="noopener">${t} ↗</a></p>`).join('')}<p class="muted">查阅日期2026-09-16；实际业务请复核当时有效规则。产业背景不代表本方案获官方背书。</p>`;
 if(view==='settings')body=`<span class="eyebrow">RELIABLE PRESENTATION</span><h1>为现场演示而准备</h1><div class="grid"><article class="tile"><h3>本地预设模式</h3><p>页面与内容可离线运行；没有模型、银行、海关或真实企业接口。刷新保留进度。</p></article><article class="tile"><h3>键盘与播放</h3><p>N / →：下一条模拟事件。输入框、弹窗中无效；长按不重复推进。遇到人审必须点击审阅确认。</p></article><article class="tile"><h3>暂停与撤回</h3><p>暂停可恢复；撤回停止本轮后续工作并保留历史，只能重置后重新演示。</p>${button(state.paused?'恢复':'暂停',state.paused?'resume':'pause')}${button('撤回本轮委托','revoke','warn')}</article><article class="tile"><h3>完整重置</h3><p>清除本页虚构进度及备注，回到采购意愿。不会改动旧版外贸演示。</p>${button('重置本次演示','reset','warn')}</article></div><p>${storageWarning?'浏览器存储不可用，本次进度只保留在内存中。':'本页只保存虚构进度和你手工输入的演示备注。请勿填写真实个人或商业敏感信息。'}</p>`;
 if(view==='settings'&&objectIndex===0)body='<span class="eyebrow">AWIKI ME BASE</span><h1>身份、沟通与数据</h1><div class="grid"><article class="tile"><h3>当前身份</h3><p>林岚 · 厦门鹭屿咖啡采购负责人（虚构）。财务、关务等专业动作保留各自具名人员身份。</p></article><article class="tile"><h3>私人AI伙伴</h3><p>只服务于当前用户。先提供建议和决定草稿，经人确认后写回事项，不作为群成员。</p></article><article class="tile"><h3>演示数据</h3><p>本地预设，不连接真实业务系统。刷新保留虚构进度；不填写真实敏感资料。</p></article><article class="tile"><h3>服务包运行</h3><p>暂停、撤回、重置与快捷键说明在左侧“咖啡进口服务包”中查看。</p></article></div>';
 if(view==='work'&&workTab!=='solutions'){
  const x=workObjects()[objectIndex]||workObjects()[0];
  if(workTab==='resources'){
   const origin=events.findIndex(e=>e.doc===x.doc);
   body='<span class="eyebrow">WORK · RESOURCE</span><h1>'+x.title+'</h1><p>来源：'+groups[events[origin].group].name+' · '+events[origin].id+'</p><ul class="doc-lines">'+docs[x.doc][1].map(t=>'<li>'+t+'</li>').join('')+'</ul><button class="btn" data-source="'+origin+'">打开来源事项</button>';
  }else body='<span class="eyebrow">WORK · TOPIC</span><h1>'+x.title+'</h1><p>'+x.sub+'</p><h2>来自事项的积累</h2>'+events.slice(0,state.cursor+1).filter(e=>x.topic===0?e.group===0:e.group===2).filter(e=>e.doc||e.risk).map(e=>'<button class="activity" data-source="'+events.indexOf(e)+'"><b>'+e.title+'</b><small>'+e.time+' ↗</small></button>').join('')+'<p>专题持续归集事实与经验，不自动创建新采购。</p>';
 }
 return '<div class="three">'+(view==='work'?sidebar():auxiliaryList())+'<main class="main">'+body+'</main>'+partner()+'</div>';

}
function auxiliaryData(){
 if(view==='messages')return [{title:'许宁 · 采购品控',sub:'普通会话 · 样品准备',text:'林岚，样品评估需要供应商提供批次信息和质量附件。收到后我会安排评估，并在关联事项提交正式回单。',actor:'quality'}];
 if(view==='overview'){
  if(overviewTab==='inbox')return [{title:'咖啡生豆采购意向',sub:'待整理的采购输入',text:'冬季拼配计划需要一柜生豆，先整理采购目标与可共享范围。',source:0}];
  if(overviewTab==='todo')return pending(state)?[{title:events[state.cursor].gate.label,sub:'等待具名人员决定',text:'打开来源事项，由右侧AI伙伴协助审阅。这里不直接产生业务承诺。',source:state.cursor}]:[{title:'当前没有待确认决定',sub:'可回到事项查看下一条进展',text:'待处理只汇总当前确实需要人员决定的事项。',source:state.cursor}];
  return events.slice(0,state.cursor+1).map((e,i)=>({title:e.title,sub:actors[e.actor].name+' · '+e.time,text:e.text,source:i})).reverse();
 }
 if(view==='connections'){
  if(connectionTab==='groups')return groups.map(g=>({title:g.name,sub:'群组 · '+g.scope,text:'成员范围由本事项决定，不继承其他群的全部上下文。',group:g.id}));
  return Object.entries(actors).filter(([id,a])=>id!=='system'&&(connectionTab==='people'?a.role.startsWith('人 ·'):connectionTab==='agents'?a.kind==='agent':id==='verify'||id==='broker'||id==='legal')).map(([id,a])=>({title:a.name,sub:a.role,text:connectionTab==='agents'?'接受所属方的明确委托，执行权限由具体事项限定；执行后回传具名结果。':'职责与所属方见角色说明。参与具体事项前仍需明确任务和资料范围。',actor:id}));
 }
 if(view==='awiki')return ({communities:[{title:'咖啡贸易实务社区',sub:'发现对象 · 未真实加入',text:'交流咖啡贸易经验与公开知识。加入社区不会自动获得企业事项资料。'}],agents:[{title:'跨时区值班智能体',sub:'能力目录 · 演示',text:'用于按明确委托收集资料、记录未决条件；使用时需要企业授权。'}],services:[{title:'进口关务与贸易核验',sub:'专业服务目录 · 演示',text:'核验材料与提供专业复核；不替代企业决定或主管部门结论。'}],solutions:[{title:'咖啡进口协同',sub:'已安装至工作 → 方案',text:'配置撮合、洽谈、履约事项模板，以及伙伴经验、专业连接和授权规则。',solution:true}]})[discoveryTab];
 return [{title:'AWiki Me 基础设置',sub:'身份、沟通与数据',text:''},{title:'咖啡进口服务包',sub:'演示运行与重置',text:''}];
}
function auxiliaryList(){
 const title={messages:'消息',overview:'一览',connections:'连接',awiki:'AWiki',settings:'设置'}[view];
 const subtitle={messages:'只承载会话，不把事项混进来',overview:'发现变化，不管理工作对象',connections:'关系、身份与可调用能力',awiki:'发现外部知识与能力',settings:'基础能力与方案包运行分开'}[view];
 const tabs=view==='overview'?{inbox:'Inbox',updates:'动态',todo:'待处理'}:view==='connections'?{people:'人员',groups:'群组',agents:'Agent',services:'服务'}:view==='awiki'?{communities:'社区',agents:'Agent',services:'服务',solutions:'方案'}:{};
 const active=view==='overview'?overviewTab:view==='connections'?connectionTab:discoveryTab;
 return `<aside class="list"><div class="title"><h2>${title}</h2><p>${subtitle}</p></div>${Object.keys(tabs).length?`<div class="tabs">${Object.entries(tabs).map(([id,t])=>`<button data-aux-tab="${id}" class="${active===id?'on':''}">${t}</button>`).join('')}</div>`:''}<label class="search">⌕ <input id="objectSearch" aria-label="搜索${title}" placeholder="搜索${title}" value="${esc(search)}"></label><div class="items">${auxiliaryData().map((x,i)=>`<button class="item ${i===objectIndex?'on':''}" data-aux-item="${i}" data-searchable="${esc(x.title+' '+x.sub)}"><span class="mark">${x.actor?actors[x.actor].mark:'◇'}</span><span class="copy"><b>${x.title}</b><span>${x.sub}</span></span></button>`).join('')}</div></aside>`;
}
function auxiliary(){
 const x=auxiliaryData()[objectIndex]||auxiliaryData()[0];
 const actions=x.source!==undefined?`<button class="btn primary" data-source="${x.source}">打开来源事项</button>`:x.group!==undefined?button(x.group<=activeGroup(state)?'打开关联事项':'等待上游回单',`group-${x.group}`,'primary',x.group>activeGroup(state)?'disabled':''):x.solution?button('在工作中查看方案','solutions','primary'):button('打开当前工作事项','current');
 const content=view==='messages'?`<section class="chat"><header class="chat-head"><h2>${x.title}</h2><p>${x.sub}</p></header><div class="chat-body"><div class="timeline"><article class="msg"><span class="avatar org">许</span><div><div class="msg-meta"><b>许宁</b><span>普通会话 · 虚构预置</span></div><div class="bubble"><p>${x.text}</p></div></div></article><div class="context"><p>涉及持续办理时，关联到现有采购事项；本会话不会自动变成事项。</p>${actions}</div></div></div></section>`:`<main class="main"><span class="eyebrow">${view.toUpperCase()}</span><h1>${x.title}</h1><p>${x.sub}</p><article class="tile"><h3>${view==='overview'?'变化与来源':view==='connections'?'职责与使用范围':'适用范围与采用边界'}</h3><p>${x.text}</p>${actions}</article>${view==='awiki'?'<p>能力目录为演示说明，未真实连接外部服务。</p>':''}</main>`;
 return `<div class="three">${auxiliaryList()}${content}${partner()}</div>`;
}
function overlay(){
 if(!modal)return '';
 let title='',body='';
 if(modal.type==='doc'){const d=docs[modal.id];title=d[0];body=`<ul class="doc-lines">${d[1].map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p class="muted">静态演示材料 · 不是实时核验结果或正式业务凭证</p>`;}
 if(modal.type==='members'){title=groups[selected].name+' · 参与者';body=`<p>仅列本群角色。私人AI伙伴不在成员列表。</p>${groups[selected].members.map(id=>{const a=actors[id];return `<div class="role-line"><span class="avatar ${a.kind}">${a.mark}</span><div><b>${a.name}</b><p>${a.role}</p></div></div>`;}).join('')}`;}
 if(modal.type==='review'){const e=events[state.cursor];title=e.gate.label;body=`<span class="pill warn">${e.actor==='finance'?'模拟财务人员决定':'模拟采购负责人决定'}</span><p class="review-text">${e.gate.decision}</p><p>确认后将以具名人员身份写入本群，智能体只执行这一范围内的后续工作。没有真实合同、付款或对外通信。</p><div class="card-actions">${button('确认并写入群聊','approve','primary')}${button('暂不确认','close')}</div>`;}
 if(modal.type==='reset'){title='从头开始本次演示？';body=`<p>将清除本页的虚构进度和演示备注，恢复最初的采购意愿。</p>${button('确认重置','confirm-reset','primary')}`;}
 if(modal.type==='revoke'){title='撤回本轮委托';body=`<p>撤回后停止所有后续模拟工作，保留已发生的消息与决定。已产生的事实不会消失，必须重置才能重新演示。</p>${button('确认撤回','confirm-revoke','warn')}`;}
 return `<div class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="modal-head"><div><span class="eyebrow">AWIKI · CONTEXT & EVIDENCE</span><h2 id="dialog-title">${title}</h2></div>${button('关闭','close')}</header><div class="modal-body">${body}</div></section></div>`;
}
function render(){
 const current=events[state.cursor];
 $('#root').innerHTML=`<div class="app"><nav class="rail" aria-label="主导航"><div class="brand">A<span>W</span></div><button class="identity" data-action="current" title="林岚 · 厦门进口企业">岚</button>${[['messages','◌','消息'],['overview','▤','一览'],['connections','◇','连接'],['awiki','A','AWiki'],['work','▣','工作']].map(([id,ico,t])=>`<button data-action="${id}" class="${view===id?'on':''}" aria-label="${t}"><span class="ico">${ico}</span><span>${t}</span></button>`).join('')}<div class="spacer"></div><button data-action="settings" class="${view==='settings'?'on':''}"><span class="ico">⚙</span>设置</button></nav><div class="workspace"><header class="demo-bar"><div><span class="live-dot"></span><b>咖啡进口 · 智能体网络协作</b><span class="demo-tag">虚构演示</span></div><div><span class="step-count">${state.cursor+1} / ${events.length}</span>${button(playing?'Ⅱ 暂停播放':'▷ 自动演示','play')}${button('下一事件 <kbd>N</kbd>','next','primary',state.paused||(view!=='work'||workTab!=='matters')||selected!==activeGroup(state)||state.cursor===events.length-1?'disabled':'')}</div></header><div class="pane">${view==='work'?(workTab==='matters'?conversation():secondary()):['messages','overview','connections','awiki'].includes(view)?auxiliary():secondary()}</div><footer class="demo-footer"><span>${notice|| (storageWarning?'存储不可用 · 本次进度不跨刷新保存':`${current.time} · ${current.night?'厦门已下班，企业授权值班中':'人员与智能体按各自职责协作'}`)}</span><span>本地预设 · 无真实业务操作 <button data-action="solutions">演示说明 ↗</button></span></footer></div></div>${overlay()}`;
 requestAnimationFrame(()=>{const c=$('.chat-body');if(c)c.scrollTop=c.scrollHeight;document.querySelectorAll('[data-searchable]').forEach(b=>{b.hidden=!b.dataset.searchable.toLowerCase().includes(search.toLowerCase());});const p=$('.partner-body');if(p&&pending(state)&&selected===activeGroup(state)&&view==='work'&&workTab==='matters'){$('.partner .gate-card')?.scrollIntoView({block:'nearest'});}else if(p&&state.notes.some(n=>n.kind==='private'&&n.group===selected))p.scrollTop=p.scrollHeight;});
 if(modal)requestAnimationFrame(()=>$('[role="dialog"] button')?.focus());
}
function source(i){selected=events[i].group;view='work';workTab='matters';search='';render();requestAnimationFrame(()=>{$(`#event-${i}`)?.scrollIntoView({block:'center',behavior:'smooth'});$(`#event-${i}`)?.classList.add('highlight');});}
function action(a){
 if(a==='solutions'){stop();view='work';workTab='solutions';objectIndex=0;search='';render();return;}
 if(['messages','overview','connections','awiki','work','settings'].includes(a)){stop();view=a;search='';objectIndex=0;render();return;}
 if(a.startsWith('group-')){selected=Number(a.slice(6));view='work';workTab='matters';search='';render();return;}
 if(a==='next'){if((view!=='work'||workTab!=='matters')||selected!==activeGroup(state)||modal)return;dispatch('next');}
 if(a==='play')play();
 if(a==='pause'||a==='resume'){stop();dispatch(a);}
 if(a==='review'){stop();reviewing=true;render();}
 if(a==='approve'){reviewing=false;modal=null;dispatch('approve');}
 if(a==='current'){selected=activeGroup(state);view='work';workTab='matters';search='';render();}
 if(a==='members'){stop();modal={type:'members'};render();}
 if(a==='close'){modal=null;render();}
 if(a==='reset'||a==='revoke'){stop();modal={type:a};render();}
 if(a==='confirm-reset'){modal=null;view='work';workTab='matters';search='';dispatch('reset');}
 if(a==='confirm-revoke'){modal=null;dispatch('revoke');}
 if(a==='review-receipt'){stop();modal={type:'doc',id:'review'};render();}
 if(a==='permissions'){stop();modal={type:'doc',id:'permissions'};render();}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.workTab){stop();workTab=b.dataset.workTab;objectIndex=0;search='';render();return;}
 if(b.dataset.object!==undefined){const i=Number(b.dataset.object),x=workObjects()[i];if(x.locked)return;stop();objectIndex=i;if(workTab==='matters')selected=x.group;render();return;}
 if(b.dataset.auxTab){stop();if(view==='overview')overviewTab=b.dataset.auxTab;if(view==='connections')connectionTab=b.dataset.auxTab;if(view==='awiki')discoveryTab=b.dataset.auxTab;objectIndex=0;search='';render();return;}
 if(b.dataset.auxItem!==undefined){objectIndex=Number(b.dataset.auxItem);render();return;}
 if(b.dataset.action)action(b.dataset.action);
 else if(b.dataset.group!==undefined){stop();selected=Number(b.dataset.group);view='work';workTab='matters';search='';render();}
 else if(b.dataset.doc){stop();modal={type:'doc',id:b.dataset.doc};render();}
 else if(b.dataset.source!==undefined){stop();source(Number(b.dataset.source));}
});
document.addEventListener('input',e=>{if(e.target.id!=='objectSearch')return;search=e.target.value;document.querySelectorAll('[data-searchable]').forEach(b=>{b.hidden=!b.dataset.searchable.toLowerCase().includes(search.toLowerCase());});});
document.addEventListener('submit',e=>{
 const form=e.target.closest('form[data-form]');if(!form)return;e.preventDefault();
 const input=form.querySelector('input');const text=input.value.trim();if(!text)return;
 if(form.dataset.form==='group'&&selected!==activeGroup(state))return;
 state={...state,notes:[...state.notes,{kind:form.dataset.form,group:selected,text:text.slice(0,1000)}]};save();render();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&modal){modal=null;render();return;}
 if(modal&&e.key==='Tab'){const els=[...document.querySelectorAll('[role="dialog"] button,[role="dialog"] a')];const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||modal||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(['n','N','ArrowRight'].includes(e.key)&&view==='work'&&workTab==='matters'&&selected===activeGroup(state)){e.preventDefault();stop();dispatch('next');}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
render();
