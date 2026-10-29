// Explicit recovery acceptance: copy only the failed matter's Pi history into a
// private temporary state directory; never alter the user's live history.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.mjs';
import { addUser } from '../src/auth.mjs';
import { loadEnvironment, configuration } from '../src/config.mjs';
import { TokenX } from '../src/tokenx.mjs';
import { PiAgent } from '../src/agent.mjs';
loadEnvironment('/etc/tokenai-agent/environment');
const base=configuration();assert.equal(base.writeEnabled,false);assert.equal(base.shareEnabled,false);
const live=new DatabaseSync('/var/lib/tokenai-agent/tokenai.sqlite',{readOnly:true});
const failed=live.prepare("SELECT t.text,m.session_file,m.tenant FROM turns t JOIN matters m ON m.id=t.matter_id WHERE t.status='failed' ORDER BY t.created DESC LIMIT 1").get();live.close();
assert.ok(failed?.session_file?.startsWith('/var/lib/tokenai-agent/sessions/'));assert.equal(failed.tenant,base.workOrderTenant);
const history=readFileSync(failed.session_file);assert.ok(history.length>100000,'Use the affected long history');
const dir=mkdtempSync(join(tmpdir(),'tokenai-long-session-')),config={...base,stateDir:dir},store=new Store(dir),tokenx=new TokenX(config),agent=new PiAgent(config,store,tokenx);
try{
 addUser(store,{username:'isolated-recovery',name:'长会话恢复验收',tenant:failed.tenant,password:randomUUID()});const user=store.get('SELECT * FROM users');const matter=store.ensureMatter(user);
 const sessions=join(dir,'sessions',matter.id);mkdirSync(sessions,{recursive:true,mode:0o700});const file=join(sessions,'copied-history.jsonl');writeFileSync(file,history,{mode:0o600});store.run('UPDATE matters SET session_file=? WHERE id=?',file,matter.id);
 const turn={id:randomUUID(),text:failed.text};store.run('INSERT INTO turns VALUES(?,?,?,?,?,?,?)',turn.id,matter.id,user.id,randomUUID(),turn.text,'queued',new Date().toISOString());
 await agent.run(matter,user,turn);
 const status=store.get('SELECT status FROM turns WHERE id=?',turn.id).status;
 const diagnostics=store.all("SELECT data FROM events WHERE turn_id=? AND type='model_response' ORDER BY seq",turn.id).map(r=>JSON.parse(r.data));
 const response=store.get("SELECT text FROM messages WHERE turn_id=? AND actor='tokenai'",turn.id)?.text||'';
 console.log(JSON.stringify({status,copiedHistoryBytes:history.length,responseChars:response.length,modelResponses:diagnostics,liveHistoryPrefixPreserved:readFileSync(failed.session_file).subarray(0,history.length).equals(history),businessOperations:store.get('SELECT COUNT(*) AS n FROM operations').n}));
 assert.equal(status,'completed');assert.ok(response.length>20);assert.equal(diagnostics.at(-1)?.stopReason,'stop');assert.equal(store.get('SELECT COUNT(*) AS n FROM operations').n,0);
}finally{await agent.close();await tokenx.close();store.close();rmSync(dir,{recursive:true,force:true});}
