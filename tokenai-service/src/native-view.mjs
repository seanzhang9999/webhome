// Only TokenX's documented public viewer may be opened as an original result.
// View tickets are bearer capabilities: keep them out of logs and shared history.
export const NATIVE_ORIGIN = 'https://mcp-local.parleyvoice.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function trustedUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) return null;
  try { const u = new URL(value); return u.origin === NATIVE_ORIGIN && !u.username && !u.password && !u.hash ? u : null; } catch { return null; }
}
export function isNativeConsole(value, subjectId) {
  const u = trustedUrl(value);
  return !!u && u.pathname === '/doc' && u.searchParams.get('subjectId') === subjectId && UUID.test(subjectId) && [...u.searchParams.keys()].every(k => ['subjectId','scenario_type'].includes(k));
}
export function isNativeReport(value) {
  const u = trustedUrl(value);
  return !!u && /^\/files\/[0-9a-f-]{36}\/file-preview$/.test(u.pathname) && [...u.searchParams.keys()].every(k => ['nonce','sign','mode'].includes(k));
}
export function nativeTicket(data, subjectId, now = Date.now()) {
  const u = trustedUrl(data?.share_url);
  // TokenX emits UTC timestamps without a suffix; never interpret them as the
  // application's local (Shanghai) timezone. Explicit offsets stay explicit.
  const expiry = data?.share_expires_at;
  const expiresAt = typeof expiry === 'string' ? Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(expiry) ? expiry + 'Z' : expiry) : NaN;
  if (!UUID.test(subjectId) || data?.subject_id !== subjectId || !u || !/^\/share\/audit\/[A-Za-z0-9._~-]{16,4096}$/.test(u.pathname) || u.search || data.share_one_time !== true || !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + 60 * 60000) throw new Error('原生查看链接未满足安全约束，请联系服务方核对');
  return { status: 'ready', subjectId, url: u.href, expiresAt, oneTime: true };
}
