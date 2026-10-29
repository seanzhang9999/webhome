import { readFileSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

export function loadEnvironment(path, env = process.env) {
  if (!existsSync(path)) return;
  if ((statSync(path).mode & 0o077) !== 0) throw new Error('Credential file must have mode 0600: ' + path);
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[2].startsWith('#')) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!env[m[1]]) env[m[1]] = value;
  }
}

export function configuration(env = process.env) {
  const publicOrigin = new URL(env.TOKENAI_PUBLIC_ORIGIN || 'https://tokenai.awiki.info').origin;
  return {
    host: env.TOKENAI_HOST || '127.0.0.1',
    port: Number(env.TOKENAI_PORT || 19320),
    stateDir: resolve(env.TOKENAI_STATE_DIR || resolve(homedir(), '.local/state/tokenai-agent')),
    publicOrigin,
    allowedOrigins: [publicOrigin, 'https://seanzhang9999.github.io'],
    mcpUrl: 'https://mcp-local.parleyvoice.com/mcp',
    mcpToken: env.TOKENX_MCP_TOKEN || '',
    mcpProxyUrl: env.TOKENAI_MCP_PROXY_URL || '',
    workOrderTenant: env.TOKENX_WORK_ORDER_TENANT || '',
    deepseekKey: env.DEEPSEEK_API_KEY || '',
    model: env.TOKENAI_MODEL || 'deepseek-v4-flash',
    modelBaseUrl: env.TOKENAI_MODEL_BASE_URL || 'https://api.deepseek.com',
    writeEnabled: env.TOKENAI_ENABLE_WRITES === '1',
    shareEnabled: env.TOKENAI_ENABLE_SHARE === '1',
    uploadContentField: env.TOKENX_UPLOAD_CONTENT_FIELD || '',
    uploadNameField: env.TOKENX_UPLOAD_NAME_FIELD || '',
    uploadEncoding: env.TOKENX_UPLOAD_ENCODING || 'base64',
    uploadDefaults: JSON.parse(env.TOKENX_UPLOAD_DEFAULTS || '{}'),
    fileLimit: 10 * 1024 * 1024,
  };
}

export function redact(value, config) {
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of [config?.mcpToken, config?.deepseekKey, config?.mcpProxyUrl].filter(Boolean)) text = text.split(secret).join('[REDACTED]');
  return text.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
}
