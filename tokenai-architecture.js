(() => {
  'use strict';
  const root = document.getElementById('tokenai-architecture');
  if (!root) return;
  const board = root.querySelector('.arch-board');
  const svg = root.querySelector('.arch-wires');
  const nodes = Object.fromEntries([...root.querySelectorAll('[data-node]')].map(el => [el.dataset.node, el]));
  const wires = [
    ['matter', 'gateway', 'request', 'right', 'left'],
    ['gateway', 'agent', 'request', 'bottom', 'top'],
    ['agent', 'mcp', 'audit', 'right', 'left'],
    ['mcp', 'audit', 'audit', 'bottom', 'top'],
    ['audit', 'evidence', 'audit', 'bottom', 'top'],
    ['agent', 'store', 'store', 'left', 'left'],
    ['matter', 'partner', 'private', 'right', 'left'],
    ['partner', 'private', 'private', 'left', 'right']
  ];
  const descriptions = {
    matter: ['前端事项群', '财务人员在固定事项提问，页面把问题和事项标识一起交给 TokenAI 服务。主助手的回复回到同一条共享讨论中。', '前端 → HTTPS API → 已登录用户所在的事项'],
    private: ['经理的私人侧栏', '同一个界面上的独立区域：自动分析跟随近期主聊天更新，私人问答由经理主动发起。私人回答不进入事项群。', '用户本人 × 当前事项 · 独立建议与问答记录'],
    gateway: ['Agent 怎样接入事项群', 'TokenAI 的事项接入服务先核实登录和成员资格，再把消息交给该事项的 Agent 会话。处理进度和回复通过事件流返回前端。', 'HTTPS API 收问题 · SSE 事件流回传 · 服务端保存消息'],
    agent: ['Pi 主 Agent', 'DeepSeek 帮助理解问题、选择工具并组织回答；真正的工单状态、规则和审核依据由 TokenX 查询返回。每个事项保留自己的主助手上下文。', '理解问题 → 调用获准工具 → 依据真实结果回答'],
    mcp: ['Agent 怎样连接审核系统', '主 Agent 经受控工具接口调用远程 MCP。凭据保存在服务端，调用先经过权限和参数检查；前端不会直接携带 TokenX 凭据访问审核系统。', 'Streamable HTTP · Bearer 服务端鉴权 · 当前开放只读查询'],
    audit: ['TokenX 审核系统', '现有财务审核服务提供工单列表、运行状态与审核详情。Agent 使用这些现有业务能力，将结果带到协作事项中。', '查询工单与规则依据 · 当前没有开放发起新审核或付款'],
    evidence: ['真实业务依据', '审核状态、逐规则结论、证据和建议来自授权数据。页面提供明细查看及审核结果导出，重要判断可以回到依据核实。', '审核完成 ≠ 已付款或已到账'],
    partner: ['独立 Pi AI 伙伴', '另一个独立会话读取当前用户可见的近期主聊天，提供自动分析和私人问答。它与主助手使用相同模型配置，业务工具全部关闭。', '分析与建议 · 不调用 MCP · 不替经理审批'],
    store: ['事项与消息记录', '服务端保存成员关联、共享消息、处理事件和事项上下文。私人建议与私人问答按用户和事项分别保存。', '刷新可继续 · 共享内容与私人内容分开访问']
  };
  const views = {
    all: {nodes: Object.keys(nodes), routes: ['request', 'audit', 'private', 'store'], title: '一条办事主线，一条私人建议线', text: '从左到右看：事项群把问题交给 Agent，Agent 查询审核系统，再把结果带回事项群。下方的独立伙伴帮助经理分析和追问。', meta: '点选任意模块查看职责，或选择上方路径高亮连接。'},
    front: {nodes: ['matter','gateway','agent','store'], routes:['request','store'], title:'事项群如何接入 Agent', text:'前端发送问题 → 服务端核实事项成员 → Pi 处理本轮对话 → 进度和回复回到原事项群。成员与消息关系由 TokenAI 事项服务维护。', meta:'HTTPS API 接入 · SSE 回传 · 当前不是浏览器直接调用模型或审核系统'},
    audit: {nodes:['agent','mcp','audit','evidence'], routes:['audit'], title:'Agent 如何接入审核系统', text:'Pi 选择获准工具 → MCP 接口检查权限和参数 → TokenX 查询授权工单 → 返回审核依据 → Pi 整理为可阅读的回答。', meta:'MCP 是工具连接通道 · DeepSeek 负责理解与表达 · TokenX 提供业务事实'},
    private: {nodes:['matter','partner','private'],routes:['private'],title:'私人伙伴如何跟上主聊天',text:'主聊天处理完成后，独立 Pi 伙伴根据近期可见讨论生成建议。经理可以继续私人提问，回答只返回自己的侧栏。',meta:'独立上下文 · 自动分析与私人问答分开 · 无业务工具'}
  };
  const steps = [
    {nodes:['matter'],routes:[],title:'1 / 6  财务人员在事项群提问',text:'“查询今天的合同付款审核明细。”问题从当前事项发出。',meta:'流程示意 · 不会提交真实查询'},
    {nodes:['matter','gateway','agent'],routes:['request'],title:'2 / 6  服务端把问题交给 Pi',text:'校验登录与事项成员资格，进入该事项的 Agent 会话。',meta:'HTTPS 请求 → TokenAI 事项接入服务 → Pi 主 Agent'},
    {nodes:['agent','mcp','audit'],routes:['audit'],title:'3 / 6  Agent 调用审核工具',text:'Pi 选择工单查询工具，服务端通过 MCP 向 TokenX 发出获准的查询。',meta:'问题理解与工具选择由 Agent 完成 · TokenX 凭据保留在服务端'},
    {nodes:['audit','evidence','mcp','agent'],routes:['audit'],title:'4 / 6  审核系统返回真实依据',text:'TokenX 返回授权工单和规则结果，Pi 据此组织答复。',meta:'返回的是当前授权范围内的结果'},
    {nodes:['agent','gateway','matter','store'],routes:['request','store'],title:'5 / 6  结果回到原事项群',text:'页面逐步显示回复，成员可以继续追问、打开明细或下载审核结果。',meta:'SSE 事件流回传 · 消息与事项记录保存在服务端'},
    {nodes:['matter','partner','private'],routes:['private'],title:'6 / 6  私人伙伴给出经理建议',text:'独立伙伴读取近期讨论，更新自动分析；经理也可在私人问答中继续追问。',meta:'经理核实依据，再按企业现有流程决定下一步'}
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
  for(const [route,color] of Object.entries({request:'#71dfff',audit:'#74efc2',private:'#c1adff',store:'#a9bbd3'})){const marker=document.createElementNS(ns,'marker');marker.id='arch-arrow-'+route;marker.setAttribute('viewBox','0 0 10 10');marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','5');marker.setAttribute('markerHeight','5');marker.setAttribute('orient','auto-start-reverse');const shape=document.createElementNS(ns,'path');shape.setAttribute('d','M 0 0 L 10 5 L 0 10 z');shape.setAttribute('fill',color);marker.append(shape);defs.append(marker);}svg.append(defs);
  for(const [from,to,route] of wires){const path=document.createElementNS(ns,'path');path.dataset.route=route;path.dataset.from=from;path.dataset.to=to;path.setAttribute('class','arch-wire '+route);path.setAttribute('marker-end','url(#arch-arrow-'+route+')');if(route!=='private'||from==='partner')path.setAttribute('marker-start','url(#arch-arrow-'+route+')');svg.append(path);}
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
