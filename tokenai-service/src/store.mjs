import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();

export class Store {
  constructor(stateDir, { recover = false } = {}) {
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(join(stateDir, 'tokenai.sqlite'));
    chmodSync(join(stateDir, 'tokenai.sqlite'), 0o600);
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, tenant TEXT NOT NULL, password TEXT NOT NULL, disabled INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,origin TEXT NOT NULL,challenge TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS auth_code_preferences(hash TEXT PRIMARY KEY REFERENCES codes(hash) ON DELETE CASCADE,remember INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS matters(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,business_key TEXT NOT NULL,title TEXT NOT NULL,session_file TEXT, UNIQUE(tenant,business_key));
      CREATE TABLE IF NOT EXISTS members(matter_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(matter_id,user_id));
      CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY,matter_id TEXT NOT NULL,user_id TEXT NOT NULL,client_id TEXT NOT NULL,text TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL, UNIQUE(matter_id,user_id,client_id));
      CREATE TABLE IF NOT EXISTS messages(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,matter_id TEXT NOT NULL,turn_id TEXT,actor TEXT NOT NULL,name TEXT NOT NULL,text TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,matter_id TEXT NOT NULL,turn_id TEXT,type TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,matter_id TEXT NOT NULL,user_id TEXT NOT NULL,tool TEXT NOT NULL,args TEXT NOT NULL,state TEXT NOT NULL,result TEXT,expires INTEGER NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,matter_id TEXT NOT NULL,operation_id TEXT,tool TEXT NOT NULL,remote_id TEXT,result TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,matter_id TEXT NOT NULL,user_id TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,path TEXT NOT NULL,size INTEGER NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS companion_advice(matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,source_seq INTEGER NOT NULL DEFAULT 0,requested_seq INTEGER NOT NULL DEFAULT 0,text TEXT NOT NULL DEFAULT '',status TEXT NOT NULL,error TEXT,updated TEXT,PRIMARY KEY(matter_id,user_id));
      CREATE INDEX IF NOT EXISTS messages_matter ON messages(matter_id,seq);
      CREATE INDEX IF NOT EXISTS events_matter ON events(matter_id,seq);
    `);
    // Never replay uncertain writes after a process restart.
    if (recover) this.db.exec("UPDATE operations SET state='unknown' WHERE state='executing'; UPDATE turns SET status='interrupted' WHERE status IN ('queued','running','stopping')");
    if (recover) this.db.exec("UPDATE companion_advice SET status='interrupted' WHERE status='generating'");
  }
  get(sql, ...args) { return this.db.prepare(sql).get(...args); }
  all(sql, ...args) { return this.db.prepare(sql).all(...args); }
  run(sql, ...args) { return this.db.prepare(sql).run(...args); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  ensureMatter(user) {
    return this.transaction(() => {
      let matter = this.get('SELECT * FROM matters WHERE tenant=? AND business_key=?', user.tenant, 'expense-control-main');
      if (!matter) {
        this.run('INSERT INTO matters(id,tenant,business_key,title) VALUES(?,?,?,?)', uid(), user.tenant, 'expense-control-main', '报销费控工作台');
        matter = this.get('SELECT * FROM matters WHERE tenant=? AND business_key=?', user.tenant, 'expense-control-main');
      }
      this.run('INSERT OR IGNORE INTO members VALUES(?,?)', matter.id, user.id);
      return matter;
    });
  }
  member(matterId, user) {
    return this.get('SELECT m.* FROM matters m JOIN members p ON p.matter_id=m.id WHERE m.id=? AND p.user_id=? AND m.tenant=?', matterId, user.id, user.tenant);
  }
  message(matterId, turnId, actor, name, text) {
    const id = uid();
    this.run('INSERT INTO messages(id,matter_id,turn_id,actor,name,text,created) VALUES(?,?,?,?,?,?,?)', id, matterId, turnId, actor, name, text, now());
    return this.get('SELECT * FROM messages WHERE id=?', id);
  }
  event(matterId, turnId, type, data) {
    this.run('INSERT INTO events(matter_id,turn_id,type,data,created) VALUES(?,?,?,?,?)', matterId, turnId, type, JSON.stringify(data), now());
  }
  close() { this.db.close(); }
}
