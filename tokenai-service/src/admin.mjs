import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { loadEnvironment, configuration } from './config.mjs';
import { Store, uid, now } from './store.mjs';
import { addUser, secret } from './auth.mjs';

process.umask(0o077);
loadEnvironment(process.env.TOKENAI_ENV_FILE || join(homedir(), '.config/tokenai-agent/environment'));
const config = configuration(), store = new Store(config.stateDir);
const [command, ...args] = process.argv.slice(2);
try {
  if (command === 'bootstrap') {
    if (store.get('SELECT COUNT(*) AS n FROM users').n) throw new Error('Users already exist; bootstrap will not overwrite accounts');
    const path = process.env.TOKENAI_BOOTSTRAP_FILE || join(homedir(), '.config/tokenai-agent/bootstrap.json');
    if (existsSync(path)) throw new Error('Bootstrap file already exists; inspect it before retrying');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const credentials = { username: 'finance-admin', password: secret(), name: '财务管理员', tenant: 'tokenai-finance' };
    store.transaction(() => {
      addUser(store, credentials);
      writeFileSync(path, JSON.stringify(credentials) + '\n', { mode: 0o600, flag: 'wx' });
    });
    console.log('Bootstrap account saved to protected file: ' + path);
  } else if (command === 'add-user') {
    const [username, name, tenant] = args;
    const password = readFileSync(0, 'utf8').trim();
    addUser(store, { username, name, tenant, password });
    console.log('Finance user added');
  } else if (command === 'attach-run') {
    const [username, remoteId] = args;
    const user = store.get('SELECT * FROM users WHERE username=? AND disabled=0', username);
    if (!user || !remoteId || remoteId.length > 200) throw new Error('Valid user and independently verified run ID required');
    const matter = store.ensureMatter(user);
    store.run('INSERT INTO runs VALUES(?,?,?,?,?,?,?)', uid(), matter.id, null, 'admin-authorized-link', remoteId, '{}', now());
    console.log('Verified run linked to authorized matter');
  } else throw new Error('Usage: admin.mjs bootstrap | add-user USERNAME NAME TENANT < password | attach-run USERNAME VERIFIED_RUN_ID');
} finally { store.close(); }
