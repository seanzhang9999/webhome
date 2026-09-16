import {events,groups,actors,docs} from './scenario.mjs';
import {initial,pending,activeGroup,reduce,restore} from './engine.mjs';
const KEY='awiki.coffee-network.v1';
let state;let storageWarning=false;
try{state=restore(localStorage.getItem(KEY));}catch{state=initial();storageWarning=true;}
let view='messages',selected=activeGroup(state),modal=null,playing=false,timer=null,notice='';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,cls='',attrs='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${text}</button>`;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageWarning=true;}}
function stop(){playing=false;clearTimeout(timer);}
function dispatch(command){
 const old=state;state=reduce(state,command);
 if(state===old){notice=pending(state)?'请先审阅主对话中的决定卡。推进键不能代替人的批准。':'当前已暂停或撤回，请查看状态。';}
 else{notice='';selected=activeGroup(state);save();}
 if(pending(state)||state.paused||state.cursor===events.length-1)stop();
 render();
}
function play(){
 if(playing){stop();render();return;}
 if(view!=='messages'||pending(state)||state.paused||selected!==activeGroup(state)||state.cursor===events.length-1){notice='当前需要人处理，自动播放不会跨过这个关口。';render();return;}
 playing=true;render();tick();
}
function tick(){timer=setTimeout(()=>{if(!playing)return;dispatch('next');if(playing)tick();},2100);}
function message(e,index){
 const a=actors[e.actor];
 return `<article class="msg ${a.kind==='me'?'me-msg':''}" id="event-${index}"><span class="avatar ${a.kind}">${a.mark}</span><div><div class="msg-meta"><b>${a.name}</b><span>${a.role}</span><time>${e.time}</time></div><div class="bubble ${e.risk?'risk-bubble':''}"><strong>${e.title}</strong><p>${e.text}</p>${e.doc?`<button class="attachment" data-doc="${e.doc}"><span>▤</span> ${docs[e.doc][0]} <span>↗</span></button>`:''}</div><div class="message-proof">${e.id} · ${e.actor==='system'?'模拟系统事件':a.kind==='agent'?'模拟智能体消息':'预置演示消息'}${e.night?' · 夜间授权范围内':''}</div></div></article>`;
}
function decisionReceipt(i){return `<article class="msg me-msg"><span class="avatar me">${events[i].actor==='finance'?'周':'岚'}</span><div><div class="msg-meta"><b>${events[i].actor==='finance'?'周敏 · 财务授权岗':'林岚 · 采购负责人'}</b><span>人员确认 · 本地演示</span></div><div class="bubble approved"><strong>✓ ${events[i].gate.label}</strong><p>${events[i].gate.decision}</p></div><div class="message-proof">DEC-${i+1} · 来源 ${events[i].id} · 明确点击确认</div></div></article>`;}
function gateCard(){
 const e=events[state.cursor];
 if(state.revoked)return `<div class="gate-card"><span class="pill warn">委托已撤回</span><h3>所有后续模拟任务已停止</h3><p>历史记录保留。要重新演示，请在设置中完整重置。</p>${button('打开设置','settings')}</div>`;
 if(state.paused)return `<div class="gate-card"><span class="pill warn">人工暂停</span><h3>未新增消息、未扩大授权</h3><p>当前事项保持原状，恢复后仍需逐个确认未决关口。</p>${button('恢复演示','resume','primary')}</div>`;
 if(pending(state))return `<section class="gate-card" aria-label="当前人员决定"><div class="eyebrow">HUMAN DECISION · ${e.actor==='finance'?'财务授权岗':'采购负责人'}</div><h3>${e.gate.label}</h3><p>${e.gate.decision}</p><div class="card-actions">${button('审阅并确认','review','primary')}${button('暂不推进','pause')}</div><small>按 N 不会批准。确认仅写入虚构演示，未发送到外部。</small></section>`;
 if(state.cursor===events.length-1)return `<section class="gate-card complete"><span class="pill ok">本单演示已完成</span><h3>从一个采购意愿，到一条完整证据链</h3><p>39个事件、7次人员确认。下一轮采购仍须重新委托。</p>${button('查看试点价值与复盘','overview','primary')}${button('重新演示','reset')}</section>`;
 return `<div class="next-cue"><span class="pulse"></span><span>下一条：${esc(events[state.cursor+1].title)}</span>${button('继续 <kbd>N</kbd>','next')}</div>`;
}
function sidebar(){return `<aside class="list"><div class="title"><span class="eyebrow">XIAMEN · COFFEE TRADE</span><h2>一颗豆的跨境旅程</h2><p>厦门鹭屿咖啡 · 林岚的工作空间</p></div><div class="tabs"><button class="on">事项群</button><button data-action="overview">工作一览</button></div><div class="chain-overview"><span>同一订单 · 三个协作空间</span><b>意愿 → 共识 → 履约</b></div><div class="items">${groups.map(g=>{const unlocked=g.id<=activeGroup(state);const count=events.slice(0,state.cursor+1).filter(e=>e.group===g.id).length;return `<button class="item ${selected===g.id?'on':''}" data-group="${g.id}" ${unlocked?'':'disabled'}><span class="mark">${unlocked?g.mark:'⌑'}</span><span class="copy"><b>${g.name}</b><span>${g.sub}</span><span class="group-progress">${unlocked?(g.id<activeGroup(state)?'已接续 · 可回看':pending(state)?'等待人员决定':'正在推进'):'等待上游批准'} · ${count} 条事件</span></span></button>`;}).join('')}<div class="chain-info"><span class="eyebrow">本次演示采购</span><h3>Brazil → Xiamen</h3><p>阿拉比卡生豆 · 一柜试单</p><div><b>19.2<span> 吨</span></b><b>320<span> 袋</span></b></div><p>桑托斯港 → 厦门港<br>各企业与人物均为虚构</p></div></div><div class="list-note"><b>可共享的是任务上下文</b><br>私人建议、预算和无关客户资料不随群流转。${button('查看协作网络','connections')}</div></aside>`;}
function partner(){
 const historical=selected!==activeGroup(state);
 const past=events.slice(0,state.cursor+1).filter(e=>e.group===selected);
 const lastInsight=[...past].reverse().find(e=>e.insight);
 const e=events[state.cursor];
 return `<aside class="partner"><header class="partner-head"><div class="partner-id"><i>✦</i><span><b>林岚的 AI 伙伴</b><small>私人工作面 · 不作为群成员发言</small></span></div><span class="pill purple">预设</span></header><div class="partner-body"><div class="context"><span class="eyebrow">${historical?'回看上下文':'当前关注'}</span><h3>${groups[selected].name}</h3><p>${historical?'你正在回看已发生的协作记录，不能在此推进当前事项。':'群里持续办事，我帮你看清证据、边界和需要拍板的地方。'}</p></div><div class="partner-message"><div class="partner-spark">✦</div><div><span class="private-label">只对你可见</span><h3>${historical?'这段协作留下了什么':e.night?'企业在值班，你可以离线':state.cursor>=8&&state.cursor<=9?'早上好，昨晚有这些进展':'我的判断与建议'}</h3><p>${lastInsight?.insight||(selected===1?'现在进入双方正式洽谈。建议先把质量、数量、价格、保险和付款做成同一版本，再交人复核与批准。':selected===2?'已签合同接续到履约。每个岗位只获得任务所需信息；批准、实际执行和外部结果是不同事件。':'你希望进口一柜生豆。我建议先让撮合方明确共享范围与夜间授权，再让网络去找合适的候选。内部评估上限USD 5.30/kg留在这里，不能随采购卡对外披露。')}</p>${lastInsight?`<button class="source-link" data-source="${events.indexOf(lastInsight)}">依据：${lastInsight.id} · ${lastInsight.time} ↗</button>`:''}</div></div><section class="context"><h3>谁在替企业持续工作</h3><div class="role-line"><span class="avatar agent">值</span><div><b>企业值班智能体</b><p>代表本企业，按委托收集与回复</p></div></div><div class="role-line"><span class="avatar agent">撮</span><div><b>空间撮合智能体</b><p>跨企业协调候选与信息缺口</p></div></div><div class="role-line"><span class="avatar me">岚</span><div><b>负责人保留商业决定</b><p>跟进、正式谈、签约分别授权</p></div></div></section><section class="context boundary"><h3>当前授权状态</h3><p>${state.revoked?'已撤回 · 不再推进':state.paused?'人工暂停 · 保留历史':state.cursor<2?'等待M01确认':state.cursor<9?'M01 · 仅资料沟通，不作承诺':state.cursor<14?'M02 · 核验与询样，不作采购承诺':state.cursor<23?'正式洽谈 · 签约另行批准':'履约 · 按各岗权限处理'}</p><small>每个新决定都必须在主对话留痕。</small></section>${state.notes.filter(n=>n.kind==='private'&&n.group===selected).map(n=>`<div class="partner-card"><b>你的私人备注</b><p>${esc(n.text)}</p><small>已保存；预设伙伴不会将自由输入当作授权。</small></div>`).join('')}</div><footer class="partner-foot"><form data-form="private"><label class="sr-only" for="privateInput">私人备注</label><div class="composer-box"><input id="privateInput" maxlength="1000" placeholder="给伙伴留一条私人备注…"><button class="btn" type="submit">保存</button></div></form><small>本地预设演示 · 非实时大模型对话</small></footer></aside>`;
}
function conversation(){
 const historical=selected!==activeGroup(state);const g=groups[selected];
 return `<div class="three">${sidebar()}<main class="chat"><header class="chat-head"><div class="head-row"><div><div class="eyebrow">MATTER ${String(selected+1).padStart(2,'0')} / 03</div><h2>${g.name}</h2><p>${g.scope}</p></div>${button('参与者','members')}</div><div class="head-meta"><span class="pill ${pending(state)?'warn':'ok'}">${historical?'历史回看':state.paused?'已停止':pending(state)?'等待人决定':'协作进行中'}</span><span class="muted">${g.handoff}</span></div></header><div class="chat-body"><div class="timeline"><div class="stage">全部人物 / 企业 / 报价 / 回执均为虚构演示</div>${events.slice(0,state.cursor+1).map((e,i)=>e.group===selected?`${e.chapter?`<div class="chapter"><span>${e.chapter}</span></div>`:''}${e.night&&(i===2)?'<div class="night-strip">☾ 厦门已下班 · 圣保罗开始工作<br><small>跨时区继续沟通，商业承诺仍等人确认</small></div>':''}${message(e,i)}${state.decisions.includes(i)?decisionReceipt(i):''}`:'').join('')}${state.notes.filter(n=>n.kind==='group'&&n.group===selected).map(n=>`<article class="msg me-msg"><span class="avatar me">岚</span><div><div class="msg-meta"><b>林岚</b><span>演示留言 · 不改变授权</span></div><div class="bubble"><p>${esc(n.text)}</p></div></div></article>`).join('')}${historical?`<div class="next-cue">历史群只读 ${button('回到当前事项','current','primary')}</div>`:gateCard()}</div></div><footer class="composer"><form data-form="group"><div class="composer-box"><label class="sr-only" for="groupInput">群内演示留言</label><input id="groupInput" maxlength="1000" placeholder="在主群聊留下演示备注…" ${historical?'disabled':''}><button class="btn" type="submit" ${historical?'disabled':''}>发送留言</button></div></form><small>只保存本地留言；业务决定请使用上方决定卡。</small></footer></main>${partner()}</div>`;
}
const sources=[['厦门咖啡产业背景 · 福建省政府','https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/flsxkmh/202604/t20260408_7120291.htm'],['厦门自贸片区建设规定 · 厦门人大','https://www.xmrd.gov.cn/xwzx/qwfb/202408/t20240830_5599071.htm'],['进口食品合格评定 · 海关办事指南','https://online.customs.gov.cn/static/pages/guides/000629009001/000629009001.html'],['第280号令 · 商务部转载','https://is.mofcom.gov.cn/zcfb/art/2026/art_5fb27bef1cf84bbcb06e0b061201a288.html'],['中国国际贸易单一窗口','https://g.singlewindow.cn/']];
function secondary(){
 const labels={overview:'工作一览',connections:'协作网络',awiki:'AWiki · 贸易能力空间',solutions:'咖啡进口协同方案',settings:'演示设置'};
 let body='';
 if(view==='overview')body=`<div class="editorial-title"><span class="eyebrow">FROM INTENT TO DELIVERY</span><h1>让企业的每一次委托，<br>都有接续、有边界、有结果。</h1><p>厦门咖啡进口 · 智能体网络协作示范</p></div><div class="metric-row"><div><b>${state.cursor+1}<small> / ${events.length}</small></b><span>已呈现的业务事件</span></div><div><b>${state.decisions.length}<small> / 7</small></b><span>已明确确认的决定</span></div><div><b>${state.cursor>=6?'1':'0'}</b><span>已记录的越权拦截</span></div></div><p class="muted">以上仅为本次虚构演示计数，不是试点成效或实际交易统计。</p><div class="grid">${groups.map(g=>`<article class="tile"><span class="eyebrow">0${g.id+1}</span><h3>${g.name}</h3><p>${g.handoff}</p>${button(g.id<=activeGroup(state)?'查看来源群聊':'等待上游决定',`group-${g.id}`,'',g.id>activeGroup(state)?'disabled':'')}</article>`).join('')}<article class="tile"><h3>面向厦门的试点建议</h3><p>从自愿参与的进口企业、撮合机构、货代与关务服务商开始，连接既有业务系统，保留企业决策和专业责任。</p><p>先建基线，再评估首响时长、人工处理时间、单证一次通过率和授权留痕完整率。</p></article></div><h2>最近发生</h2>${events.slice(Math.max(0,state.cursor-4),state.cursor+1).reverse().map(e=>`<button class="activity" data-source="${events.indexOf(e)}"><span>${e.time}</span><b>${e.title}</b><small>${actors[e.actor].name} ↗</small></button>`).join('')}`;
 if(view==='connections')body=`<span class="eyebrow">AGENT NETWORK · ACCOUNTABLE BY DESIGN</span><h1>每个智能体都有所属方，<br>每份任务都有授权边界。</h1><div class="network-map"><div>厦门进口企业<br><b>林岚 + 企业值班 / 采购Agent</b></div><span>⇄ 授权意愿与证据 ⇄</span><div>咖啡贸易空间<br><b>撮合智能体 + 核验服务</b></div><span>⇄ 最小必要信息 ⇄</span><div>巴西供货企业<br><b>Marina + 销售Agent</b></div></div><div class="grid">${[['人的私人伙伴','只向本人提供摘要、判断和草稿；不以本人名义自动发言。'],['企业执行智能体','接受明确委托，在授权期限和范围内持续沟通；例外必须回到人。'],['专业服务机构','关务、合同、财务与品控各有负责人，提供专业复核与回单。'],['法定业务系统','单一窗口、海关、银行等由授权人员办理。此Demo均为模拟回执。']].map(([t,p])=>`<article class="tile"><h3>${t}</h3><p>${p}</p></article>`).join('')}</div>${button('查看履约共享边界','permissions','primary')}`;
 if(view==='solutions')body=`<span class="pill">已选择 · 咖啡进口协同</span><h1>三个人机混合群，<br>一条连续的贸易链。</h1><p>主对话负责协作和决定；私人伙伴帮人理解和判断；各方执行智能体持续接力。</p><div class="solution-path">${groups.map((g,i)=>`<article><span>0${i+1}</span><div><h2>${g.name}</h2><p>${g.sub}</p><small>${g.handoff}</small></div></article>`).join('')}</div><div class="tile"><h3>建议的8–10分钟讲解顺序</h3><p>意愿和授权（1分钟） → 夜间接力及拦截（2分钟） → 晨报与正式谈决定（2分钟） → 条款和签署（2分钟） → 单证异常与进口履约（3分钟）。</p><p>按N逐条揭示消息；自动播放也会在7个人员决定处停下。完整方案说明含研究来源、职责与试点建议。</p><a class="btn" href="awiki-coffee-import-design.html" target="_blank" rel="noopener">打开完整方案 ↗</a></div>`;
 if(view==='awiki')body=`<span class="eyebrow">CAPABILITY SPACE · CONCEPT DEMO</span><h1>连接能力，也连接责任。</h1><p>本页展示可组合的角色与服务，不表示已经连接真实服务商或政府系统。</p><div class="grid">${[['跨境撮合','让需求对接候选，并持续补齐双方信息缺口。'],['贸易核验','提供主体、批次及供货材料核验的证据，不保证成交。'],['进口关务协同','按现行商品和国别规则进行专业复核，组织申报材料。'],['港航与仓储','从装运计划到验收回单，把异常送到负责的人。']].map(([t,p])=>`<article class="tile"><span class="pill gray">方案角色 · 未真实连接</span><h3>${t}</h3><p>${p}</p>${button('查看责任关系','connections')}</article>`).join('')}</div><h2>研究与业务依据</h2>${sources.map(([t,u])=>`<p><a href="${u}" target="_blank" rel="noopener">${t} ↗</a></p>`).join('')}<p class="muted">查阅日期2026-09-16；实际业务请复核当时有效规则。产业背景不代表本方案获官方背书。</p>`;
 if(view==='settings')body=`<span class="eyebrow">RELIABLE PRESENTATION</span><h1>为现场演示而准备</h1><div class="grid"><article class="tile"><h3>本地预设模式</h3><p>页面与内容可离线运行；没有模型、银行、海关或真实企业接口。刷新保留进度。</p></article><article class="tile"><h3>键盘与播放</h3><p>N / →：下一条模拟事件。输入框、弹窗中无效；长按不重复推进。遇到人审必须点击审阅确认。</p></article><article class="tile"><h3>暂停与撤回</h3><p>暂停可恢复；撤回停止本轮后续工作并保留历史，只能重置后重新演示。</p>${button(state.paused?'恢复':'暂停',state.paused?'resume':'pause')}${button('撤回本轮委托','revoke','warn')}</article><article class="tile"><h3>完整重置</h3><p>清除本页虚构进度及备注，回到采购意愿。不会改动旧版外贸演示。</p>${button('重置本次演示','reset','warn')}</article></div><p>${storageWarning?'浏览器存储不可用，本次进度只保留在内存中。':'本页只保存虚构进度和你手工输入的演示备注。请勿填写真实个人或商业敏感信息。'}</p>`;
 return `<div class="secondary"><aside class="subnav"><div class="title"><h2>${labels[view]}</h2><p>厦门咖啡进口协作示范</p></div>${Object.entries(labels).map(([k,v])=>`<button data-action="${k}" class="${view===k?'on':''}">${v} <span>›</span></button>`).join('')}${button('返回当前群聊','current','primary')}</aside><main class="main">${body}</main>${partner()}</div>`;
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
 $('#root').innerHTML=`<div class="app"><nav class="rail" aria-label="主导航"><div class="brand">A<span>W</span></div><button class="identity" data-action="current" title="林岚 · 厦门进口企业">岚</button>${[['messages','◌','消息'],['overview','▤','一览'],['connections','◇','连接'],['awiki','A','AWiki'],['solutions','▣','方案']].map(([id,ico,t])=>`<button data-action="${id}" class="${view===id?'on':''}" aria-label="${t}"><span class="ico">${ico}</span><span>${t}</span></button>`).join('')}<div class="spacer"></div><button data-action="settings" class="${view==='settings'?'on':''}"><span class="ico">⚙</span>设置</button></nav><div class="workspace"><header class="demo-bar"><div><span class="live-dot"></span><b>咖啡进口 · 智能体网络协作</b><span class="demo-tag">虚构演示</span></div><div><span class="step-count">${state.cursor+1} / ${events.length}</span>${button(playing?'Ⅱ 暂停播放':'▷ 自动演示','play')}${button('下一事件 <kbd>N</kbd>','next','primary',state.paused||view!=='messages'||selected!==activeGroup(state)||state.cursor===events.length-1?'disabled':'')}</div></header><div class="pane">${view==='messages'?conversation():secondary()}</div><footer class="demo-footer"><span>${notice|| (storageWarning?'存储不可用 · 本次进度不跨刷新保存':`${current.time} · ${current.night?'厦门已下班，企业授权值班中':'人员与智能体按各自职责协作'}`)}</span><span>本地预设 · 无真实业务操作 <button data-action="solutions">演示说明 ↗</button></span></footer></div></div>${overlay()}`;
 requestAnimationFrame(()=>{const c=$('.chat-body');if(c)c.scrollTop=c.scrollHeight;const p=$('.partner-body');if(p&&state.notes.some(n=>n.kind==='private'&&n.group===selected))p.scrollTop=p.scrollHeight;});
 if(modal)requestAnimationFrame(()=>$('[role="dialog"] button')?.focus());
}
function source(i){selected=events[i].group;view='messages';render();requestAnimationFrame(()=>{$(`#event-${i}`)?.scrollIntoView({block:'center',behavior:'smooth'});$(`#event-${i}`)?.classList.add('highlight');});}
function action(a){
 if(['messages','overview','connections','awiki','solutions','settings'].includes(a)){stop();view=a;render();return;}
 if(a.startsWith('group-')){selected=Number(a.slice(6));view='messages';render();return;}
 if(a==='next'){if(view!=='messages'||selected!==activeGroup(state)||modal)return;dispatch('next');}
 if(a==='play')play();
 if(a==='pause'||a==='resume'){stop();dispatch(a);}
 if(a==='review'){stop();modal={type:'review'};render();}
 if(a==='approve'){modal=null;dispatch('approve');}
 if(a==='current'){selected=activeGroup(state);view='messages';render();}
 if(a==='members'){stop();modal={type:'members'};render();}
 if(a==='close'){modal=null;render();}
 if(a==='reset'||a==='revoke'){stop();modal={type:a};render();}
 if(a==='confirm-reset'){modal=null;view='messages';dispatch('reset');}
 if(a==='confirm-revoke'){modal=null;dispatch('revoke');}
 if(a==='permissions'){stop();modal={type:'doc',id:'permissions'};render();}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.action)action(b.dataset.action);
 else if(b.dataset.group!==undefined){stop();selected=Number(b.dataset.group);view='messages';render();}
 else if(b.dataset.doc){stop();modal={type:'doc',id:b.dataset.doc};render();}
 else if(b.dataset.source!==undefined){stop();source(Number(b.dataset.source));}
});
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
 if(['n','N','ArrowRight'].includes(e.key)&&view==='messages'&&selected===activeGroup(state)){e.preventDefault();stop();dispatch('next');}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
render();
