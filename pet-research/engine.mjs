import {stages,outputs,actors,stageMessages} from './data.mjs';
export const initial=()=>({schema:1,stage:0,version:1,baseline:null,status:'ready',mode:'human',step:0,approved:false,revoked:false,config:{temperature:260,calibrated:true},events:[],commands:[],results:[],privateNotes:[],nextApproved:false,treeRuns:[],round:1,baselineVersion:null,nextProposal:null,approvals:[]});
export const hasApproval=(s,stage)=>s.approvals.some(a=>a.stage===stage&&a.version===s.version);
export const gate=s=>s.revoked?'revoked':s.status==='paused'?'paused':hasApproval(s,7)?'complete':!s.baseline?'baseline':s.stage===3&&!hasApproval(s,3)?'route':s.stage===5&&!hasApproval(s,5)?'plan':s.stage===6?'execution':s.stage===7&&!hasApproval(s,7)?'next':null;
export const evaluate=r=>({mfr:r.mfr<60,density:r.density<1.25,tensile:r.tensile>=25,hardness:r.hardness>=70&&r.hardness<=80,vicat:r.vicat>90});
export function stageOutput(s,i){
 const current=s.results.filter(r=>r.valid&&r.version===s.version);
 if(i===0)return {...outputs[0],selected_baseline:s.baseline,confirmation:'Demo选择；不是独立客户确认',baseline_version:s.baselineVersion};
 if(i===3)return {...outputs[3],decision:s.approvals.filter(a=>a.stage===3&&a.version===s.version),status:hasApproval(s,3)?'accepted':'proposed'};
 if(i===4)return {...outputs[4],iteration_proposal:s.nextProposal};
 if(i===5)return {...outputs[5],mode:s.mode,simulation_config:s.config,expert_approval:hasApproval(s,5)};
 if(i===6)return {mode:s.mode,operation_step:s.step,raw_evidence:current,quarantined:s.results.filter(r=>!r.valid).map(r=>({evidence:r.evidence,reason:r.isolation_reason})),simulated:true};
 if(i===7)return {quality:'仅当前版本有效演示数据',evaluation:current.map(r=>({sample:r.sample,evidence:r.evidence,comparison:evaluate(r)})),knowledge:current.map(r=>({status:'候选知识，非训练',sample:r.sample,suggestion:r.sample==='A3'?'降低软段并复查维卡/硬度/尺寸':r.sample==='D1'?'补齐D1详细卡，复测尺寸':'保留A2候选，补测迁移/密封/尺寸'})),next_approved:hasApproval(s,7),simulated:true};
 return outputs[i];
}
export function contract(s,i){return {schema:'pet-stage/1',stage:'L'+i,name:stages[i],task_version:s.version,source:i===0?['S1','S2','S4']:['S2','S3','S4'],dependencies:i?['L'+(i-1)+'@v'+(s.events.filter(e=>e.stage===i-1&&e.kind==='accepted').at(-1)?.version||s.version)]:['S1','S2'],responsible_agent:'pet-L'+i+'-01',status:i<s.stage?'handed-over':i===s.stage?(s.nextApproved?'completed':s.status):'waiting',input:{baseline:s.baseline,baseline_version:s.baselineVersion,task_version:s.version,upstream:i?stageOutput(s,i-1):null},output:stageOutput(s,i),stop_conditions:['撤销','版本不匹配','缺少批准',...(i===6?['参数超界','校准失效','执行卡缺失']:[]),...(i===7?['异常数据','测量条件版本不匹配']:[])],handoff_receipts:s.events.filter(e=>e.stage===i&&e.version===s.version&&e.kind==='accepted')};}
export function reduce(old,c){
 if(!c||typeof c.operation_id!=='string'||!c.operation_id||old.commands.some(x=>x.operation_id===c.operation_id))return old;
 const s=structuredClone(old);s.commands.push(structuredClone(c));
 const emit=(kind,text,data={})=>s.events.push({id:'E'+(s.events.length+1),operation_id:c.operation_id,stage:s.stage,version:s.version,actor:c.actor,role:actors[c.actor]||'未知角色',kind,text,data,sources:['S1','S2']});
 const narrate=()=>{const m=stageMessages[s.stage];emit('proposed',m.text,{title:m.title,speaker:m.agent,artifact:m.artifact,source_label:'来源建议 / 本地演示',contract:contract(s,s.stage)});};
 const newVersion=()=>{s.version++;s.approved=false;s.nextApproved=false;s.step=0;};
 const deny=reason=>{emit('rejected',reason);return s;};
 if(!actors[c.actor])return deny('角色未知');
 if(c.version!==s.version)return deny('过时回单/命令：必须绑定当前版本');
 const requireRole=(roles)=>roles.includes(c.actor);
 if(c.type==='group-note'){emit('note',String(c.text).slice(0,1000),{label:'普通群内本地备注；不构成批准或授权'});return s;}
 if(c.type==='tree'){
 const phases=['Think','Resource','Execute','Evaluate'];
 let run=s.treeRuns.at(-1);
 if(!run||run.phase===4||run.version!==s.version){run={id:'TREE-'+(s.treeRuns.length+1),version:s.version,board:'PET-01/requirements@v'+s.version,phase:0,steps:[]};s.treeRuns.push(run);}
 const messages=['理解分歧：S1与S2温度/循环口径冲突；目标是形成可追溯基线。','调用资源：引用S1原始需求、S2方案及客户确认模板；无外部数据调用。','推进Board：形成待客户澄清提议，不自动确认。','检查Board：争议仍未由客户确认；返回客户确认关口。'];
 const phase=phases[run.phase];run.steps.push({phase,evidence:['S1','S2'],decision:null,receipt:'E'+(s.events.length+1)});emit('proposed',phase+'：'+messages[run.phase],{run_id:run.id,board:run.board});run.phase++;return s;
 }
 if(c.type==='private'){s.privateNotes.push({text:String(c.text).slice(0,1000),version:s.version});return s;}
 if(c.type==='publish'){if(!requireRole(['lead']))return deny('仅负责人可发布私人建议');emit('proposed',String(c.text).slice(0,1000));return s;}
 if(c.type==='revoke'){if(!requireRole(['lead']))return deny('只有负责人可撤销');s.revoked=true;s.status='paused';s.approved=false;emit('disputed','授权撤销，所有执行阻断');return s;}
 if(c.type==='query'){return deny(s.revoked?'授权已撤销':c.audience!=='lab-adapter'?'错误 audience':c.resource!=='TC-01'?'最小披露：无权查询客户私密配方':'用途/NDA限制：目录与JSON不授予数据访问权限');}
 if(c.type==='baseline'){
 if(!requireRole(['customer']))return deny('需求基线须客户角色确认');
 if(!['S1','S2','clarify'].includes(c.choice))return deny('未知基线');
 if(s.baseline){emit('superseded','旧基线及其审批被替代；历史结果仍绑定旧版本');newVersion();}
 s.baseline=c.choice==='clarify'?null:c.choice;s.baselineVersion=s.version;s.stage=0;s.status=s.baseline?'ready':'paused';s.approved=false;s.step=0;s.nextApproved=false;
 emit(s.baseline?'accepted':'disputed',s.baseline?'用户在Demo确认采用 '+s.baseline+'，不等于独立客户证据':'已请求澄清：温度冲突保持未解决',{confirmed_version:s.version,sources:['S1','S2']});if(s.baseline)narrate();return s;}
 if(c.type==='reject'){if(!requireRole(['customer','lead','expert','technician']))return deny('Agent不能人工拒绝');s.status='paused';s.approved=false;emit('rejected','当前提议拒绝，等待修订');return s;}
 if(c.type==='revise'){
 if(!requireRole(['lead','expert']))return deny('修订须负责人或专家');emit('superseded','上一任务版本保留，旧批准失效');newVersion();s.approved=false;s.step=0;s.status='ready';s.nextApproved=false;s.stage=Math.min(s.stage,5);emit('proposed','已修订为新版本，需重新批准');return s;}
 if(c.type==='config'){
 if(!requireRole(['expert']))return deny('配置须实验专家');
 if(typeof c.temperature!=='number'||!Number.isFinite(c.temperature)||typeof c.calibrated!=='boolean')return deny('配置契约错误');
 s.config={temperature:c.temperature,calibrated:c.calibrated};s.approved=false;s.step=0;s.stage=Math.min(s.stage,5);s.status='ready';newVersion();emit('proposed','配置变更：冻结旧版，须重新批准');return s;}
 if(c.type==='mode'){if(!requireRole(['expert'])||!['human','device'].includes(c.mode))return deny('模式须专家选择');s.mode=c.mode;s.step=0;s.approved=false;s.stage=Math.min(s.stage,5);newVersion();s.status='ready';emit('proposed','执行路径变更，重新批准');return s;}
 if(s.revoked)return deny('撤销不可用重试恢复；须重置开始新演示');
 if(s.status==='paused')return deny('暂停中：先修订/纠错，重新批准');
 if(!s.baseline)return deny('温度条件未确认');
 if(c.type==='next-round'){
 if(c.actor!=='lead'||!hasApproval(s,7))return deny('须本轮完成后由负责人创建下一轮提案');
 const evidence=s.results.filter(r=>r.valid&&r.version===s.version).map(r=>r.evidence);
 s.nextProposal={parent_version:s.version,evidence,proposal:'依据本轮候选知识重新规划；所有工艺须专家重审',status:'proposed'};newVersion();s.round++;s.stage=4;s.approved=false;s.step=0;s.nextApproved=false;s.status='ready';emit('proposed','下一轮提案已创建：进入L4规划→L5专家重审',{proposal:s.nextProposal});narrate();return s;
 }
 if(c.type==='approve'){
 const role=s.stage===3?'lead':s.stage===5?'expert':s.stage===7?'lead':null;
 if(c.actor!==role)return deny('审批角色/阶段不匹配');
 if(s.stage===7){if(hasApproval(s,7))return deny('本轮已完成，不能重复批准；请创建下一轮提案');if(!s.results.some(r=>r.version===s.version&&r.valid))return deny('无当前版本有效演示数据');s.approvals.push({stage:7,version:s.version,actor:c.actor,operation_id:c.operation_id});s.nextApproved=true;s.status='completed';emit('accepted','批准下一轮建议；模型/知识仅本地候选记录');return s;}
 if(hasApproval(s,s.stage))return deny('此阶段版本已批准');s.approvals.push({stage:s.stage,version:s.version,actor:c.actor,operation_id:c.operation_id});s.approved=true;emit('accepted','批准 L'+s.stage+'@v'+s.version+'，仅模拟范围');return s;}
 if(c.type==='next'){
 if(gate(s))return deny('人工关口暂停：推进不能代替确认');
 if(s.stage>=7)return deny('本轮结束');emit('accepted','L'+s.stage+' → L'+(s.stage+1)+' 交接回单',{artifact:'L'+s.stage+'交接工件',contract:contract(s,s.stage)});s.stage++;s.approved=false;narrate();return s;}
 if(c.type==='execute'){
 if(s.stage!==6)return deny('尚未到L6');if(!hasApproval(s,5))return deny('缺少当前版本L5专家批准');
 if(s.config.temperature<250||s.config.temperature>285||!s.config.calibrated){s.status='paused';emit('disputed','适配检查失败：参数须250–285℃且校准有效。纠错后重新批准');return s;}
 if(s.mode==='device'){
 if(s.step===2)return deny('设备操作已完成，等待测量确认');
 if(c.actor!=='agent'||c.audience!=='lab-adapter'||c.resource!=='TC-01'||c.action!=='simulate'||c.purpose!=='PET首轮验证')return deny('设备身份/授权 audience/resource/action/purpose 检查失败');
 s.step=2;emit('accepted','模拟设备完成；身份/资源/动作/参数/版本/校准检查通过',{raw_evidence:'RAW-'+c.operation_id});return s;}
 if(c.actor!=='technician')return deny('实验员模式禁止Agent自动操作仪器');
 if(s.step>=2)return deny('操作回执已完成，请上传/确认测量');s.step++;emit('accepted',s.step===1?'实验员接受操作与采集卡':'实验员提交操作回执；无真实仪器控制');return s;}
 if(c.type==='measure'){
 if(s.stage!==6||s.step!==2||c.actor!=='technician')return deny('需先完成操作回执，再由实验员确认测量');
 if(!['A2','A3','D1'].includes(c.sample))return deny('未知样品');
 if(c.sample==='D1'&&s.mode==='device')return deny('D1详细执行卡缺失，禁止设备执行；可在人工模式载入历史演示测量');
 const values=c.sample==='A3'?{mfr:62,density:1.24,tensile:24,hardness:68,vicat:88}:c.sample==='D1'?{mfr:40,density:1.22,tensile:29,hardness:76,vicat:96}:{mfr:45,density:1.23,tensile:27,hardness:74,vicat:93};
 const r={...values,sample:c.sample,version:s.version,baseline:s.baseline,valid:!c.anomaly,isolation_reason:c.anomaly?'模拟质量异常：测量证据不可信，必须重新采集确认':null,demo:true,evidence:'RAW-'+c.operation_id,origin:c.sample==='D1'?'历史演示数据，非TC-01执行产物':s.mode};s.results.push(r);
 emit(r.valid?'accepted':'disputed',r.valid?'测量质检通过（仅演示数据），交接L7':'异常测量隔离，不得进入L7',r);if(r.valid){s.stage=7;narrate();}return s;}
 return deny('未知命令');
}
export function restore(raw){try{const x=JSON.parse(raw);if(x.schema!==1||!Array.isArray(x.commands)||x.commands.length>10000)return initial();return x.commands.reduce(reduce,initial());}catch{return initial();}}
