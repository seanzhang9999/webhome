/** Browser-only synthetic demo. Authorization below controls the demo UI, not a security boundary. */
export const VERSION=1;
export const ROLES={doctor:{name:'赵医生',org:'安和家医团队',label:'家医 · 赵医生',initial:'赵'},patient:{name:'王女士',org:'患者本人',label:'患者 · 王女士',initial:'王'},family:{name:'小王',org:'获授权家属',label:'家属 · 小王',initial:'家'},ops:{name:'林悦',org:'健联体运营',label:'运营 · 林悦',initial:'林'},researcher:{name:'陈研究员',org:'科研合作方',label:'科研 · 陈研究员',initial:'陈'},auditor:{name:'周审核员',org:'数据空间审核方',label:'数据审核 · 周审核员',initial:'周'}};
export const CARE_EVENTS=[
 {group:'family',actor:'patient',title:'持续服务的起点',text:'我想把日常测量、复查和家里的配合都安排起来。有问题时，希望能继续找到熟悉我的家医。'},
 {group:'family',actor:'agent',title:'先确认服务与共享范围',text:'我已整理入组需要确认的内容。照护授权仅用于本管理包；家属共享和科研参与分别设置，不随入组自动开启。',gate:'careGrant',resource:'consent'},
 {group:'care',actor:'doctor',title:'共同确认第一份管理包',text:'这份管理包包括日常测量记录、团队随访和周期复评。具体诊疗由医生负责，今天先确认目标、任务分工和异常接管方式。',gate:'plan',resource:'plan'},
 {group:'family',actor:'agent',title:'管理包开始执行',text:'计划已由家医与患者共同确认。本次需要王女士提交测量记录、林悦完成随访安排。家属任务仅在本人授权共享后开放。',gate:'tasks',resource:'tasks'},
 {group:'care',actor:'agent',title:'发现需要家医复核的线索',text:'演示规则提示一条异常趋势，已汇总测量条件与近期反馈。尚未形成诊断，请家医核对并确认后续处置。',gate:'review',resource:'review'},
 {group:'family',actor:'doctor',title:'家医持续回应',text:'我已完成本轮复核，安排按约定的线下复核流程继续处理。请反馈是否已收到安排，团队会继续跟进。此处为模拟医生回执。',gate:'followup',resource:'tasks'},
 {group:'care',actor:'agent',title:'周期复评有据可查',text:'本轮任务、医生复核和患者反馈已关联到管理包。服务完成与临床效果分别记录，当前没有真实临床结果或疗效结论。',resource:'report'},
 {group:'care',actor:'doctor',title:'共同确认下一周期',text:'根据本轮执行情况，下一周期保留随访与复评安排，并更新任务节奏。调整需由我与王女士对同一版本分别确认。',gate:'next',resource:'next'},
 {group:'family',actor:'agent',title:'持续管理进入下一轮',text:'下一周期计划已确认。本轮决定与回执继续保留，可启动新周期并再次核对目标与授权。',resource:'report'}
];
export const RESEARCH_EVENTS=[
 {group:'research',actor:'researcher',title:'用计算委托表达项目目标',text:'希望评估本项目的随访完成情况。仅需要经批准的聚合结果，不申请直接访问患者原始档案。',gate:'mandate',resource:'mandate'},
 {group:'research',actor:'agent',title:'先对齐指标与语义',text:'“完成随访”需要同时有完成标记与具名服务签收；分母为本次获准范围的合成记录。请请求方与数据审核方确认映射版本。',gate:'semantic',resource:'ontology'},
 {group:'research',actor:'agent',title:'独立核验科研使用授权',text:'照护授权不自动转为科研授权。项目审核方需核验合成队列授权凭证，患者另行确认本项目参与范围。本页面不代表任何真实伦理审批。',gate:'researchGrant',resource:'consent'},
 {group:'compute',actor:'agent',title:'在获准数据域内执行计算',text:'委托、语义映射和授权已齐备。数据方 Agent 可按冻结的输入与算法版本运行聚合计算，随后等待输出审核。',gate:'compute',resource:'computation'},
 {group:'compute',actor:'agent',title:'结果返回前进行输出审查',text:'审核接收方、用途、字段和最小样本数。小样本结果需要驳回并修订范围。未经放行，请求方无法在界面查看结果。',gate:'release',resource:'output'},
 {group:'research',actor:'agent',title:'获准结果返回请求方',text:'结果携带委托、输入快照、映射和输出策略版本。计算完成与输出放行已有独立回执，仍需要请求方验收任务结果。',gate:'accept',resource:'result'},
 {group:'research',actor:'researcher',title:'计算委托闭环',text:'已按本次目标验收获准结果。后续研究问题需另建委托，结果使用继续受当前目的与接收方约束。',resource:'result'}
];
export const GROUPS={family:{title:'王女士 · 家庭健康群',description:'日常互动、提醒与家庭协作',roles:['patient','family','doctor','ops'],icon:'家'},care:{title:'家医 · 持续管理事项',description:'管理包、复核与周期复评',roles:['patient','doctor','ops'],icon:'医'},service:{title:'专业服务 · 协作事项',description:'家医发起的专业服务交接',roles:['doctor','ops'],icon:'专'},research:{title:'科研 · 计算委托事项',description:'研究目标、口径与结果验收',roles:['researcher','auditor','patient'],icon:'研'},compute:{title:'数据域 · 计算与输出审核',description:'受控执行、脱敏与放行',roles:['auditor'],icon:'数'}};
export const BOARDS={plan:{name:'慢病管理包共同确认',approvers:['doctor','patient'],roles:['doctor','patient','ops'],min:2,group:'care'},review:{name:'异常复核与处置记录',approvers:['doctor'],roles:['doctor','patient'],min:4,group:'care'},next:{name:'下一周期计划',approvers:['doctor','patient'],roles:['doctor','patient','ops'],min:7,group:'care'},service:{name:'专业服务交接',approvers:['doctor','ops'],roles:['doctor','ops'],min:3,group:'service'},mandate:{name:'科研计算委托',approvers:['researcher','auditor'],roles:['researcher','auditor','patient'],min:0,group:'research'},semantic:{name:'指标口径与本体映射',approvers:['researcher','auditor'],roles:['researcher','auditor'],min:1,group:'research'}};
export const TASKS=[{id:'measure',title:'提交本轮测量与测量条件',owner:'patient',description:'只需确认已按计划记录，不填写真实健康数据。',required:true},{id:'contact',title:'完成本轮随访安排',owner:'ops',description:'确认联络与预约状态，医疗判断交由家医。',required:true},{id:'support',title:'陪伴完成家庭协作任务',owner:'family',description:'可选。患者授权后协助执行，不能查看完整病历。',required:false}];
const clone=x=>JSON.parse(JSON.stringify(x));
export function createSpace(id,name,type='care'){
 return {id,name,type,cursor:0,cycle:1,grant:false,familyShare:false,researchGrant:false,studyApproved:false,authEpoch:1,boards:Object.fromEntries(Object.keys(BOARDS).filter(k=>type==='care'?['plan','review','next','service'].includes(k):['mandate','semantic'].includes(k)).map(k=>[k,{version:1,signatures:[],hold:false,summary:''}])),tasks:{},followup:false,scope:'all',queryCount:0,computation:null,release:null,accepted:false,notes:{},messages:[],history:[{cycle:1,index:0}],receipts:[],serviceInvited:false};
}
export function freshRegistry(){return {version:VERSION,active:'CARE-001',role:'doctor',spaces:{'CARE-001':createSpace('CARE-001','安和家医 · 王女士管理空间'),'ECG-001':createSpace('ECG-001','心电监测 · 科研协作示例','ecg'),'BCI-001':createSpace('BCI-001','脑机监测 · 科研协作示例','bci')}};}
export function validRegistry(x){return Boolean(x&&x.version===VERSION&&ROLES[x.role]&&x.spaces&&x.spaces[x.active]&&Object.entries(x.spaces).every(([id,s])=>s.id===id&&['care','ecg','bci'].includes(s.type)&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<events(s).length&&s.boards&&Array.isArray(s.receipts)&&Array.isArray(s.history)&&Array.isArray(s.messages)&&s.notes&&s.tasks));}
export const events=s=>s.type==='care'?CARE_EVENTS:RESEARCH_EVENTS;
export const currentEvent=s=>events(s)[s.cursor];
export const boardAvailable=(s,k)=>Boolean(s.boards[k]&&s.cursor>=BOARDS[k].min);
export const boardConfirmed=(s,k)=>Boolean(boardAvailable(s,k)&&!s.boards[k].hold&&BOARDS[k].approvers.every(r=>s.boards[k].signatures.some(a=>a.role===r&&a.version===s.boards[k].version)));
export const held=s=>Object.keys(s.boards).some(k=>boardAvailable(s,k)&&s.boards[k].hold);
export function groupVisible(s,g,role){if(!GROUPS[g]?.roles.includes(role))return false;if(s.type==='care'?!['family','care','service'].includes(g):!['research','compute'].includes(g))return false;if(g==='service'&&!s.serviceInvited)return false;if(role==='family'&&(!s.grant||!s.familyShare))return false;return true;}
export function accessibleGroups(s,role){return Object.keys(GROUPS).filter(k=>groupVisible(s,k,role));}
export function canViewBoard(s,k,role){return boardAvailable(s,k)&&BOARDS[k].roles.includes(role);}
export function canViewResult(s,role){return ['researcher','auditor'].includes(role)&&Boolean(s.computation&&s.release?.status==='approved'&&s.release.epoch===s.authEpoch&&s.researchGrant&&s.studyApproved&&!held(s)&&boardConfirmed(s,'mandate')&&boardConfirmed(s,'semantic'));}
export function ready(s){if(held(s))return false;const gate=currentEvent(s).gate;if(s.type==='care'&&s.cursor>=2&&!s.grant)return false;if(s.type==='care'&&s.cursor>2&&!boardConfirmed(s,'plan'))return false;if(s.type==='care'&&s.cursor>4&&!boardConfirmed(s,'review'))return false;if(!gate)return true;if(s.type==='care'){
 if(gate==='careGrant')return s.grant;
 if(!s.grant)return false;
 if(['plan','review','next'].includes(gate))return boardConfirmed(s,gate);
 if(gate==='tasks')return boardConfirmed(s,'plan')&&TASKS.filter(t=>t.required).every(t=>s.tasks[t.id]?.cycle===s.cycle);
 if(gate==='followup')return s.followup&&boardConfirmed(s,'review');
 }else{
 if(['mandate','semantic'].includes(gate))return boardConfirmed(s,gate);
 if(gate==='researchGrant')return s.studyApproved&&s.researchGrant;
 if(!s.studyApproved||!s.researchGrant||!boardConfirmed(s,'mandate')||!boardConfirmed(s,'semantic'))return false;
 if(gate==='compute')return Boolean(s.computation&&s.computation.epoch===s.authEpoch);
 if(gate==='release')return canViewResult(s,'researcher');
 if(gate==='accept')return canViewResult(s,'researcher')&&s.accepted;
 }return false;
}
function receipt(s,actor,kind,detail,scope='all',ref=''){const r={id:`${s.id}-R${String(s.receipts.length+1).padStart(3,'0')}`,actor,kind,detail,scope,ref,cycle:s.cycle,at:new Date().toISOString(),synthetic:true};s.receipts.push(r);return r;}
function demand(ok,message){if(!ok)throw new Error(message);}
function invalidateResearch(s){s.computation=null;s.release=null;s.accepted=false;}
function resetBoard(s,k){s.boards[k].version++;s.boards[k].signatures=[];s.boards[k].hold=false;}
export function visibleReceipts(s,role){return s.receipts.filter(r=>r.scope==='all'?accessibleGroups(s,role).length>0:r.scope.split(',').includes(role));}
export function perform(s,action,actor,data={}){
 demand(ROLES[actor],'未知演示角色');
 if(action==='next'){
  demand(s.cursor<events(s).length-1,'本轮已完成');demand(accessibleGroups(s,actor).length>0,'当前角色未加入这个空间');demand(ready(s),'当前关口尚未完成，或存在暂停 / 撤回状态');s.cursor++;s.history.push({cycle:s.cycle,index:s.cursor});return '已进入下一环节';
 }
 if(action==='grantCare'){
  demand(s.type==='care'&&actor==='patient','照护授权只能由患者本人确认');demand(!s.grant,'照护授权已经有效');s.grant=true;s.authEpoch++;receipt(s,actor,'照护授权','授权本管理包的照护使用；家属与科研用途不自动开启','doctor,patient,ops');if(s.cursor>2){s.cursor=2;resetBoard(s,'plan');}return '照护授权已确认';
 }
 if(action==='revokeCare'){
  demand(s.type==='care'&&actor==='patient'&&s.grant,'仅患者可撤回当前照护授权');s.grant=false;s.familyShare=false;s.tasks={};s.followup=false;s.authEpoch++;Object.keys(s.boards).forEach(k=>resetBoard(s,k));receipt(s,actor,'撤回授权','停止后续照护执行和家属共享，保留本地演示历史','doctor,patient,ops');return '授权已撤回，后续执行已停止';
 }
 if(action==='familyShare'){
  demand(s.type==='care'&&actor==='patient'&&s.grant,'仅患者在照护授权有效时设置家属共享');s.familyShare=!s.familyShare;receipt(s,actor,'家属共享',s.familyShare?'允许家属查看协作任务及提醒摘要':'已停止家属共享','doctor,patient');return s.familyShare?'家属任务与摘要共享已开启':'家属共享已关闭';
 }
 if(action==='sign'){
  const k=data.board;demand(boardAvailable(s,k),'这个共同确认尚未开始');const b=s.boards[k];demand(BOARDS[k].approvers.includes(actor),'当前角色不能替该责任人确认');demand(data.version===b.version,'版本已变化，请重新查看后确认');demand(!held(s),'存在暂停的共同工作对象，请先恢复并重新确认');
  if(s.type==='care')demand(s.grant,'照护授权尚未生效或已撤回');
  demand(!b.signatures.some(a=>a.role===actor&&a.version===b.version),'你已经确认过此版本');b.signatures.push({role:actor,version:b.version,at:new Date().toISOString()});receipt(s,actor,'具名确认',`${BOARDS[k].name} v${b.version} 已由 ${ROLES[actor].name} 确认`,BOARDS[k].roles.join(','),k);return '已记录你的确认，其他责任人仍需独立确认';
 }
 if(action==='hold'){
  const k=data.board;demand(boardAvailable(s,k)&&BOARDS[k].approvers.includes(actor),'仅本对象的确认责任人可暂停或恢复');const b=s.boards[k];b.hold=!b.hold;b.signatures=[];if(s.type!=='care'){invalidateResearch(s);if(!b.hold)s.cursor=k==='mandate'?0:1;}else if(!b.hold){s.cursor=Math.min(s.cursor,BOARDS[k].min);}receipt(s,actor,b.hold?'暂停':'恢复',`${BOARDS[k].name}：原确认已失效，恢复后需重新确认`,BOARDS[k].roles.join(','),k);return b.hold?'已暂停，后续推进被阻断':'已恢复，请对当前版本重新确认';
 }
 if(action==='amend'){
  const k=data.board;demand(boardAvailable(s,k),'对象尚未建立');demand(s.type==='care'?actor==='doctor':['researcher','auditor'].includes(actor),'当前角色无权修订');demand(!held(s),'暂停期间不能修订');resetBoard(s,k);s.boards[k].summary=String(data.summary||'更新执行说明，等待共同确认').slice(0,400);if(s.type==='care'){if(k==='plan'){s.tasks={};s.followup=false;resetBoard(s,'review');resetBoard(s,'next');if(s.cursor>2)s.cursor=2;}if(k==='review'){s.followup=false;if(s.cursor>4)s.cursor=4;}}else{invalidateResearch(s);s.cursor=k==='mandate'?0:1;if(k==='mandate')resetBoard(s,'semantic');}receipt(s,actor,'版本修订',`${BOARDS[k].name} 更新至 v${s.boards[k].version}，旧版确认不再适用于本版`,BOARDS[k].roles.join(','),k);return '已生成新版本，请各责任人重新确认';
 }
 if(action==='task'){
  demand(s.type==='care'&&s.cursor>=3&&s.grant&&boardConfirmed(s,'plan')&&!held(s),'管理包未生效、已暂停或授权已撤回');const t=TASKS.find(t=>t.id===data.id);demand(t&&t.owner===actor,'只能由任务责任人提交执行回执');if(actor==='family')demand(s.familyShare,'患者尚未授权家属参与');demand(s.tasks[t.id]?.cycle!==s.cycle,'本周期任务已经完成');const r=receipt(s,actor,'执行回执',t.title,'doctor,patient,ops'+(actor==='family'?',family':''),'tasks');s.tasks[t.id]={cycle:s.cycle,receipt:r.id,actor};return '已记录任务执行回执';
 }
 if(action==='followup'){
  demand(actor==='patient'&&s.type==='care'&&s.cursor>=5&&s.grant&&!held(s)&&boardConfirmed(s,'review'),'需由患者在家医复核完成后反馈');demand(!s.followup,'反馈已经记录');s.followup=true;receipt(s,actor,'患者反馈','已收到家医安排，本轮反馈已关联处置记录','doctor,patient,ops','review');return '已收到你的反馈';
 }
 if(action==='inviteService'){
  demand(s.type==='care'&&actor==='doctor'&&s.cursor>=3&&s.grant&&boardConfirmed(s,'plan')&&!held(s),'需由家医在管理包生效后发起');demand(!s.serviceInvited,'专业服务事项已经建立');s.serviceInvited=true;receipt(s,actor,'专业服务委托','建立专业服务交接，由家医与运营明确范围；专家 Agent 为辅助示意','doctor,ops','service');return '已建立专业服务事项';
 }
 if(action==='newCycle'){
  demand(s.type==='care'&&actor==='doctor'&&s.cursor===CARE_EVENTS.length-1&&s.grant&&!held(s)&&boardConfirmed(s,'next'),'需由家医在下一周期计划确认后启动');s.cycle++;s.cursor=2;s.followup=false;s.tasks={};s.serviceInvited=false;Object.keys(s.boards).forEach(k=>resetBoard(s,k));s.history.push({cycle:s.cycle,index:2});receipt(s,actor,'新周期','保留既往回执，重新确认本周期管理包','doctor,patient,ops');return '新周期已建立，历史记录继续保留';
 }
 if(action==='scope'){
  demand(s.type!=='care'&&actor==='researcher','计算范围由请求方修订');demand(['all','small'].includes(data.scope),'未知计算范围');demand(!held(s),'暂停期间不可变更');demand(data.scope!==s.scope,'当前已采用该范围');s.scope=data.scope;resetBoard(s,'mandate');resetBoard(s,'semantic');invalidateResearch(s);s.cursor=0;receipt(s,actor,'委托变更','范围变更，需重新确认委托与语义版本','researcher,auditor','mandate');return '范围已修订，原确认及计算结果已失效';
 }
 if(action==='study'){
  demand(s.type!=='care'&&actor==='auditor'&&s.cursor>=2&&!held(s),'需由数据审核方在口径确认后核验');demand(boardConfirmed(s,'mandate')&&boardConfirmed(s,'semantic'),'委托和语义尚未共同确认');demand(!s.studyApproved,'项目授权核验已记录');s.studyApproved=true;receipt(s,actor,'项目授权核验','已核验48条合成队列记录的示例授权凭证。非真实伦理审批或数据使用许可。','researcher,auditor,patient','consent');return '示例项目授权核验已记录';
 }
 if(action==='researchGrant'){
  demand(s.type!=='care'&&actor==='patient'&&s.cursor>=2,'本项目参与应由患者在独立授权环节确认');demand(!s.researchGrant,'本项目授权已经有效');s.researchGrant=true;s.authEpoch++;invalidateResearch(s);if(s.cursor>3)s.cursor=3;receipt(s,actor,'科研参与确认','仅同意本项目的示例统计计算，不授权其他项目或原始病历外发','patient,auditor,researcher','consent');return '本项目参与已确认，与照护授权分别记录';
 }
 if(action==='revokeResearch'){
  demand(s.type!=='care'&&actor==='patient'&&s.researchGrant,'仅患者可撤回本项目参与');s.researchGrant=false;s.authEpoch++;invalidateResearch(s);receipt(s,actor,'科研授权撤回','停止后续计算和结果返回；既往发出结果无法远程收回，保留历史审计记录','patient,auditor,researcher','consent');return '科研授权已撤回，计算与结果返回已阻断';
 }
 if(action==='compute'){
  demand(s.type!=='care'&&actor==='auditor'&&s.cursor>=3,'计算由数据域责任方启动');demand(!held(s)&&s.researchGrant&&s.studyApproved&&boardConfirmed(s,'mandate')&&boardConfirmed(s,'semantic'),'授权、委托或语义确认不满足，不能计算');demand(!s.computation,'本版本已有计算回执，不重复执行');demand(s.queryCount<3,'本空间的演示查询预算已用完，需另行审查新委托');
  const records=Array.from({length:48},(_,i)=>({id:`SYN-${i+1}`,done:i%4!==0,signed:i%6!==0}));const frozen=s.scope==='small'?records.slice(0,4):records;const complete=frozen.filter(r=>r.done&&r.signed).length;s.queryCount++;s.computation={id:`${s.id}-CALC-${s.queryCount}`,n:frozen.length,complete,rate:Math.round(complete/frozen.length*1000)/10,epoch:s.authEpoch,scope:s.scope,mandateVersion:s.boards.mandate.version,ontologyVersion:s.boards.semantic.version,input:'SYNTHETIC-COHORT-48-v1',algorithm:'completed-and-signed@1',policy:'aggregate-min-10@1',synthetic:true};s.release=null;s.accepted=false;receipt(s,actor,'计算执行','已按冻结输入完成域内聚合，尚未批准输出','auditor','computation');return '计算完成，结果等待输出审查';
 }
 if(action==='release'){
  demand(s.type!=='care'&&actor==='auditor'&&s.cursor>=4,'输出需由审核方在计算完成后审查');demand(s.computation&&s.researchGrant&&s.studyApproved&&!held(s)&&s.computation.epoch===s.authEpoch&&boardConfirmed(s,'mandate')&&boardConfirmed(s,'semantic'),'授权或计算版本无效，不能返回结果');demand(s.release?.status!=='approved','本结果已放行');
  const approve=data.decision==='approve';demand(['approve','reject'].includes(data.decision),'必须明确放行或驳回');demand(!approve||s.computation.n>=10,'最小样本要求为10，当前小样本结果必须驳回');s.release={status:approve?'approved':'rejected',epoch:s.authEpoch,actor,computation:s.computation.id,policy:s.computation.policy,reason:approve?'允许聚合字段，样本阈值通过，接收方与用途匹配':String(data.reason||'输出不满足项目披露策略，需修订委托范围').slice(0,300)};receipt(s,actor,approve?'输出放行':'输出驳回',approve?'批准聚合结果返回科研请求方，未包含个体明细':s.release.reason,'researcher,auditor','output');return approve?'结果已放行，可由请求方验收':'已驳回，请求方可修订范围后重走确认';
 }
 if(action==='accept'){
  demand(actor==='researcher'&&s.type!=='care'&&s.cursor>=5&&canViewResult(s,actor),'需由请求方在结果获准返回后验收');demand(!s.accepted,'本次结果已验收');s.accepted=true;receipt(s,actor,'任务验收','已核对目标、指标口径与获准结果，任务验收完成','researcher,auditor','result');return '已记录任务验收';
 }
 if(action==='denyRaw'){
  demand(s.type!=='care'&&['researcher','auditor'].includes(actor),'当前角色不参与计算委托');receipt(s,actor,'越界请求阻断','请求原始患者名单超出聚合统计目的，未返回数据','researcher,auditor','mandate');return '已阻断：本委托仅允许聚合结果，不提供原始患者名单';
 }
 if(action==='note'){demand(accessibleGroups(s,actor).length>0,'当前角色未加入空间');s.notes[actor]=String(data.text||'').slice(0,3000);return '私人笔记已保存在当前角色与空间';}
 if(action==='message'){
  demand(groupVisible(s,data.group,actor),'当前角色不能向该事项发送内容');const content=String(data.text||'').trim().slice(0,1500);demand(content,'请先填写内容');s.messages.push({id:`M-${s.messages.length+1}`,actor,group:data.group,text:content,cycle:s.cycle,at:new Date().toISOString()});return '消息已写入当前事项（本地演示）';
 }
 throw new Error('未支持的操作');
}
export function exportResult(s,role){demand(canViewResult(s,role),'当前角色没有可导出的获准结果');return {space:s.id,provenance:'SYNTHETIC_DEMO',purpose:'本项目随访完成情况聚合统计',recipient:ROLES[role].label,result:clone(s.computation),outputReview:clone(s.release),acceptance:s.accepted?'已验收':'待验收',receipts:clone(s.receipts.filter(r=>['输出放行','任务验收'].includes(r.kind)&&r.ref))};}
