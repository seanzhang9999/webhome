import { events } from './scenario.mjs';
export const VERSION=1;
export const initial=()=>({version:VERSION,cursor:0,decisions:[],paused:false,revoked:false,notes:[]});
export const pending=s=>events[s.cursor]?.gate&&!s.decisions.includes(s.cursor);
export const activeGroup=s=>events[s.cursor].group;
export function reduce(s,command){
 if(command==='reset')return initial();
 if(command==='pause')return {...s,paused:true};
 if(command==='resume'&&!s.revoked)return {...s,paused:false};
 if(command==='revoke')return {...s,paused:true,revoked:true};
 if(s.paused||s.revoked)return s;
 if(command==='approve'&&pending(s))return {...s,decisions:[...s.decisions,s.cursor]};
 if(command==='next'&&!pending(s)&&s.cursor<events.length-1)return {...s,cursor:s.cursor+1};
 return s;
}
export function restore(raw){
 try{
  const s=JSON.parse(raw);
  if(s.version!==VERSION||!Number.isInteger(s.cursor)||s.cursor<0||s.cursor>=events.length||!Array.isArray(s.decisions)||typeof s.paused!=='boolean'||typeof s.revoked!=='boolean'||!Array.isArray(s.notes))return initial();
  if(s.decisions.some(i=>!Number.isInteger(i)||i>s.cursor||!events[i]?.gate)||new Set(s.decisions).size!==s.decisions.length)return initial();
  if(events.some((e,i)=>i<s.cursor&&e.gate&&!s.decisions.includes(i)))return initial();
  if(s.revoked&&!s.paused)return initial();
  if(s.notes.some(n=>!n||!['group','private'].includes(n.kind)||![0,1,2].includes(n.group)||typeof n.text!=='string'||n.text.length>1000))return initial();
  return {version:VERSION,cursor:s.cursor,decisions:s.decisions,paused:s.paused,revoked:s.revoked,notes:s.notes};
 }catch{return initial();}
}
