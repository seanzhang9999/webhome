import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { uid } from './store.mjs';

export const hash = s => createHash('sha256').update(s).digest('hex');
export const challenge = s => createHash('sha256').update(s).digest('base64url');
export const secret = () => randomBytes(32).toString('base64url');
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function passwordValid(password, stored) {
  const [salt, digest] = stored.split(':');
  const expected = Buffer.from(digest, 'hex');
  const supplied = scryptSync(password, salt, 64);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
const dummyPassword = passwordHash(secret());

export function addUser(store, { username, name, tenant, password }) {
  if (!/^[A-Za-z0-9@._+-]{3,120}$/.test(username) || password.length < 14 || !tenant || !name) throw new Error('Valid username, name, tenant and password (14+ characters) required');
  store.run('INSERT INTO users(id,username,name,tenant,password) VALUES(?,?,?,?,?)', uid(), username, name, tenant, passwordHash(password));
}
export function issueCode(store, config, { username, password, origin, codeChallenge, remember = false }) {
  if (typeof remember !== 'boolean') throw Object.assign(new Error('Invalid remember preference'), { statusCode: 400 });
  if (!config.allowedOrigins.includes(origin) || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge || '')) throw Object.assign(new Error('Invalid authorization request'), { statusCode: 400 });
  const user = store.get('SELECT * FROM users WHERE username=?', username);
  const valid = passwordValid(password, user?.password || dummyPassword);
  if (!user || !valid || user.disabled) throw Object.assign(new Error('账号或密码错误'), { statusCode: 401 });
  const code = secret();
  store.transaction(() => {
    store.run('DELETE FROM codes WHERE expires<?', Date.now());
    store.run('INSERT INTO codes(hash,user_id,origin,challenge,expires) VALUES(?,?,?,?,?)', hash(code), user.id, origin, codeChallenge, Date.now() + 60000);
    if (remember) store.run('INSERT INTO auth_code_preferences(hash,remember) VALUES(?,1)', hash(code));
  });
  return code;
}
export function exchangeCode(store, { code, verifier, origin }) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier || '')) throw Object.assign(new Error('Invalid verifier'), { statusCode: 400 });
  return store.transaction(() => {
    const entry = store.get('SELECT c.*,COALESCE(p.remember,0) AS remember FROM codes c LEFT JOIN auth_code_preferences p ON p.hash=c.hash WHERE c.hash=?', hash(code || ''));
    if (!entry || entry.expires < Date.now() || entry.origin !== origin || entry.challenge !== challenge(verifier)) throw Object.assign(new Error('Authorization code invalid or expired'), { statusCode: 401 });
    const user = store.get('SELECT * FROM users WHERE id=? AND disabled=0', entry.user_id);
    if (!user) throw Object.assign(new Error('Account disabled'), { statusCode: 401 });
    store.run('DELETE FROM codes WHERE hash=?', hash(code));
    const token = secret(), expires = Date.now() + (entry.remember ? 7 * 24 * 60 * 60000 : 30 * 60000);
    store.run('DELETE FROM tokens WHERE expires<?', Date.now());
    store.run('INSERT INTO tokens VALUES(?,?,?)', hash(token), user.id, expires);
    return { accessToken: token, expiresAt: expires, remember: !!entry.remember };
  });
}
export function authenticate(store, request) {
  const token = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) throw Object.assign(new Error('请先登录财务账号'), { statusCode: 401 });
  const user = store.get('SELECT u.* FROM tokens t JOIN users u ON u.id=t.user_id WHERE t.hash=? AND t.expires>? AND u.disabled=0', hash(token), Date.now());
  if (!user) throw Object.assign(new Error('登录已过期，请重新登录'), { statusCode: 401 });
  return user;
}
