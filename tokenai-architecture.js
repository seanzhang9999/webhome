(() => {
  'use strict';
  const root = document.getElementById('tokenai-architecture');
  if (!root) return;
  const board = root.querySelector('.arch-board');
  const svg = root.querySelector('.arch-wires');
  const nodes = Object.fromEntries([...root.querySelectorAll('[data-node]')].map(el => [el.dataset.node, el]));
  const wires = [
    ['matter', 'presence', 'request', 'bottom', 'top'],
    ['presence', 'agent', 'request', 'right', 'left'],
    ['agent', 'mcp', 'audit', 'right', 'left'],
    ['mcp', 'audit', 'audit', 'bottom', 'top'],
    ['audit', 'evidence', 'audit', 'bottom', 'top'],
    ['agent', 'gateway', 'store', 'bottom', 'top'],
    ['gateway', 'store', 'store', 'bottom', 'top'],
    ['context', 'partner', 'private', 'right', 'left'],
    ['review-context', 'partner', 'review', 'right', 'left'],
    ['partner', 'private', 'private', 'right', 'left']
  ];
  const descriptions = {
    matter: ['前端事项群', '财务人员在固定事项提问，页面把问题和事项标识一起交给 TokenAI 服务。主助手的回复回到同一条共享讨论中。', '前端 → HTTPS API → 已登录用户所在的事项'],
    presence: ['主 Agent 已在固定事项里', '左边的 TokenAI 报销费控助手，就是中间 Pi 主 Agent 在事项中的身份。财务人员直接与它在同一事项对话，中间展示它实际运行和调用工具的位置。', '同一个主 Agent · 群内参与者与服务端运行的两种视角'],
    context: ['私人伙伴的上下文来源', '下方的分析依据来自上方同一事项中当前用户可见的近期讨论。它不是另一份业务台账，也不会自动扩大数据访问范围。', '主聊天上下文 → 独立私人分析'],
    'review-context': ['审核明细旁的工单依据', '在明细里提问时，浏览器提交所选工单标识，TokenAI 服务端校验当前用户权限，再通过只读 MCP 取得这张单的规则、结论与证据，提供给独立伙伴分析。', '提问时读取当前工单 · 回答标注读取时间 · 工单历史分别保存'],
    private: ['同一伙伴的两个使用入口', '事项侧栏提供自动分析和普通私人问答；审核明细右侧提供当前工单问答。可以直接问风险、缺失材料，也可以针对某条规则追问。私人回答不进入事项群。', '仅本人可见 · 按工单保留问答 · 关闭再打开或刷新后可继续'],
    gateway: ['Agent 怎样接入事项群', 'TokenAI 的事项接入服务先核实登录和成员资格，再把消息交给该事项的 Agent 会话。处理进度和回复通过事件流返回前端。', 'HTTPS API 收问题 · SSE 事件流回传 · 服务端保存消息'],
    agent: ['Pi 主 Agent', 'DeepSeek 帮助理解问题、选择工具并组织回答；真正的工单状态、规则和审核依据由 TokenX 查询返回。每个事项保留自己的主助手上下文。', '理解问题 → 调用获准工具 → 依据真实结果回答'],
    mcp: ['Agent 怎样连接审核系统', '主 Agent 经受控工具接口调用远程 MCP。凭据保存在服务端，调用先经过权限和参数检查；前端不会直接携带 TokenX 凭据访问审核系统。', 'Streamable HTTP · Bearer 服务端鉴权 · 当前开放只读查询'],
    audit: ['TokenX 审核系统', '现有财务审核服务提供工单列表、运行状态与审核详情。Agent 使用这些现有业务能力，将结果带到协作事项中。', '查询工单与规则依据 · 当前没有开放发起新审核或付款'],
    evidence: ['真实业务依据', '审核状态、逐规则结论、证据和建议来自授权数据。页面提供明细查看及审核结果导出，重要判断可以回到依据核实。', '审核完成 ≠ 已付款或已到账'],
    partner: ['独立 Pi AI 伙伴', '结合近期主聊天提供建议；在审核明细里提问时，还会收到服务端按权限读取的当前工单。它解释规则和证据，并参考本人在这张单上的历史问答，Pi 会话自身没有业务执行工具。', '服务器提供获授权工单上下文 · 独立 Pi 给出私人建议 · 由人决定'],
    store: ['事项与消息记录', '服务端保存成员关联、共享消息、处理事件和事项上下文。私人建议与私人问答按用户和事项分别保存。', '刷新可继续 · 共享内容与私人内容分开访问']
  };
  const views = {
    all: {nodes: Object.keys(nodes), routes: ['request', 'audit', 'private', 'review', 'store'], title: '一条办事主线，一条私人建议线', text: '上方：财务人员与主 Agent 同在固定事项，主 Agent 在服务端调用审核系统。下方：私人伙伴既能跟随事项讨论，也能在审核明细旁结合当前工单回答问题。', meta: '点选任意模块查看职责，或选择上方路径高亮连接。'},
    front: {nodes: ['matter','presence','gateway','agent','store'], routes:['request','store'], title:'事项群如何接入 Agent', text:'主 Agent 已作为 TokenAI 报销费控助手出现在固定事项里，财务人员直接与它对话。中间的 Pi 是同一助手的服务端运行，登录校验与消息回传为这段对话提供支撑。', meta:'群内身份 ⇄ 同一 Agent 的服务端运行 · HTTPS 收问题 · SSE 回回复'},
    audit: {nodes:['agent','mcp','audit','evidence'], routes:['audit'], title:'Agent 如何接入审核系统', text:'Pi 选择获准工具 → MCP 接口检查权限和参数 → TokenX 查询授权工单 → 返回审核依据 → Pi 整理为可阅读的回答。', meta:'MCP 是工具连接通道 · DeepSeek 负责理解与表达 · TokenX 提供业务事实'},
    private: {nodes:['context','partner','private'],routes:['private'],title:'事项旁的私人伙伴',text:'主聊天处理完成后，独立 Pi 伙伴根据近期可见讨论生成自动分析。经理也可以主动私人提问，回答只返回自己的侧栏。',meta:'自动分析与私人问答分开 · 不改写主聊天'},
    review: {nodes:['context','review-context','partner','private'],routes:['review','private'],title:'审核明细旁，针对这张单问 AI',text:'打开工单明细 → 选择一条规则或直接提问 → 服务端鉴权读取当前工单 → 私人伙伴结合规则与证据解释。问答按工单保存，回答时保留左侧阅读位置。',meta:'左侧看审核 · 右侧问 AI · 工单数据由服务端提供，Pi 不自主调用业务工具'}
  };
  const steps = [
    {nodes:['matter','presence'],routes:['request'],title:'1 / 7  财务人员在事项群提问',text:'“查询今天的合同付款审核明细。”问题从当前事项发出。',meta:'流程示意 · 不会提交真实查询'},
    {nodes:['matter','presence','gateway','agent'],routes:['request'],title:'2 / 7  群内主助手开始处理',text:'事项里的 TokenAI 就是这个 Pi 主 Agent；服务端校验成员并在对应事项会话中处理问题。',meta:'HTTPS 请求 → TokenAI 事项接入服务 → Pi 主 Agent'},
    {nodes:['agent','mcp','audit'],routes:['audit'],title:'3 / 7  Agent 调用审核工具',text:'Pi 选择工单查询工具，服务端通过 MCP 向 TokenX 发出获准的查询。',meta:'问题理解与工具选择由 Agent 完成 · TokenX 凭据保留在服务端'},
    {nodes:['audit','evidence','mcp','agent'],routes:['audit'],title:'4 / 7  审核系统返回真实依据',text:'TokenX 返回授权工单和规则结果，Pi 据此组织答复。',meta:'返回的是当前授权范围内的结果'},
    {nodes:['agent','gateway','presence','matter','store'],routes:['request','store'],title:'5 / 7  结果回到原事项群',text:'页面逐步显示回复，成员可以继续追问、打开明细或下载审核结果。',meta:'SSE 事件流回传 · 消息与事项记录保存在服务端'},
    {nodes:['evidence','review-context','private'],routes:['review'],title:'6 / 7  打开审核明细，针对规则提问',text:'左侧看中文结论、证据与建议；点击“请 AI 解释这条规则”，在右侧准备好问题后发送。',meta:'打开明细不自动发问 · 发送时校验权限并读取所选工单'},
    {nodes:['context','review-context','partner','private'],routes:['review','private'],title:'7 / 7  结合当前工单，给出私人建议',text:'伙伴引用当前工单的依据解释风险与待核事项。问答按工单保留，刷新后仍能继续；左侧阅读位置不受回复影响。',meta:'私人问答不发到事项群 · 经理核实证据后决定下一步'}
  ];
  let selectedView='all';
  let timer;
  const title=root.querySelector('.arch-detail-title');
  const copy=root.querySelector('.arch-detail-copy p');
  const meta=root.querySelector('.arch-detail-meta');
  const play=root.querySelector('[data-arch-play]');
  const status=root.querySelector('.arch-status');
  function detail(t,c,m){title.textContent=t;copy.textContent=c;meta.textContent=m;}
  function highlight(nodeKeys,routes,running=false){
    Object.entries(nodes).forEach(([key,el])=>{el.classList.toggle('is-active',nodeKeys.includes(key));el.classList.toggle('is-dim',!nodeKeys.includes(key));});
    svg.querySelectorAll('.arch-wire').forEach(path=>{const active=routes.includes(path.dataset.route);path.classList.toggle('is-active',active);path.classList.toggle('is-dim',!active);path.classList.toggle('is-running',running&&active);});
  }
  function stop(){clearTimeout(timer);timer=undefined;play.textContent='演示一次提问';play.setAttribute('aria-pressed','false');status.textContent='连接关系示意 · 非实时监控';}
  function showView(key){selectedView=key;const view=views[key];root.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===key)));Object.values(nodes).forEach(el=>el.setAttribute('aria-pressed','false'));highlight(view.nodes,view.routes);detail(view.title,view.text,view.meta);}
  const ns='http://www.w3.org/2000/svg';
  const defs=document.createElementNS(ns,'defs');
  for(const [route,color] of Object.entries({request:'#71dfff',audit:'#74efc2',private:'#c1adff',review:'#74efc2',store:'#a9bbd3'})){const marker=document.createElementNS(ns,'marker');marker.id='arch-arrow-'+route;marker.setAttribute('viewBox','0 0 10 10');marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','5');marker.setAttribute('markerHeight','5');marker.setAttribute('orient','auto-start-reverse');const shape=document.createElementNS(ns,'path');shape.setAttribute('d','M 0 0 L 10 5 L 0 10 z');shape.setAttribute('fill',color);marker.append(shape);defs.append(marker);}svg.append(defs);
  for(const [from,to,route] of wires){const path=document.createElementNS(ns,'path');path.dataset.route=route;path.dataset.from=from;path.dataset.to=to;path.setAttribute('class','arch-wire '+route);path.setAttribute('marker-end','url(#arch-arrow-'+route+')');if(!['private','review'].includes(route)||from==='partner')path.setAttribute('marker-start','url(#arch-arrow-'+route+')');svg.append(path);}
  function point(el,side){const r=el.getBoundingClientRect(),b=board.getBoundingClientRect();return {x:(side==='left'?r.left:side==='right'?r.right:r.left+r.width/2)-b.left,y:(side==='top'?r.top:side==='bottom'?r.bottom:r.top+r.height/2)-b.top};}
  function draw(){const r=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);[...svg.querySelectorAll('.arch-wire')].forEach((path,i)=>{const [from,to,route,a,b]=wires[i];const p=point(nodes[from],a),q=point(nodes[to],b);let d;if(a==='bottom'&&b==='top'){const mid=(p.y+q.y)/2;d=`M${p.x},${p.y} C${p.x},${mid} ${q.x},${mid} ${q.x},${q.y}`;}else if(route==='store'){const bend=p.x-22;d=`M${p.x},${p.y} C${bend},${p.y} ${bend},${q.y} ${q.x},${q.y}`;}else{const bend=Math.max(18,Math.abs(q.x-p.x)*.5);const sign=a==='left'?-1:1;d=`M${p.x},${p.y} C${p.x+sign*bend},${p.y} ${q.x-sign*bend},${q.y} ${q.x},${q.y}`;}path.setAttribute('d',d);});}
  root.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{stop();showView(el.dataset.view);}));
  Object.entries(nodes).forEach(([key,el])=>el.addEventListener('click',()=>{stop();root.querySelectorAll('[data-view]').forEach(control=>control.setAttribute('aria-pressed','false'));Object.values(nodes).forEach(n=>n.setAttribute('aria-pressed',String(n===el)));const nearby=wires.filter(([a,b])=>a===key||b===key);highlight([...new Set([key,...nearby.flatMap(([a,b])=>[a,b])])],[...new Set(nearby.map(x=>x[2]))]);detail(...descriptions[key]);}));
  play.addEventListener('click',()=>{if(timer){stop();showView(selectedView);return;}root.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed','false'));Object.values(nodes).forEach(el=>el.setAttribute('aria-pressed','false'));let index=0;play.textContent='停止演示';play.setAttribute('aria-pressed','true');status.textContent='流程演示中 · 不会发出真实业务请求';const next=()=>{const step=steps[index];highlight(step.nodes,step.routes,true);detail(step.title,step.text,step.meta);index++;timer=setTimeout(()=>{if(index<steps.length)next();else{stop();status.textContent='流程演示完成 · 可点选模块继续查看';}},3000);};next();});
  const full=root.querySelector('[data-arch-fullscreen]');
  if(!document.fullscreenEnabled)full.hidden=true;
  full.addEventListener('click',async()=>{try{if(document.fullscreenElement===root)await document.exitFullscreen();else await root.requestFullscreen();}catch{status.textContent='当前浏览器不支持全屏，可使用浏览器缩放查看。';}});
  document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement===root?'退出大图':'放大架构图';requestAnimationFrame(draw);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();showView(selectedView);}});
  new ResizeObserver(draw).observe(board);
  document.fonts.ready.then(draw);
  showView('all');
})();
