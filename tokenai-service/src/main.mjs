import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadEnvironment, configuration } from './config.mjs';
import { buildApp } from './app.mjs';

process.umask(0o077);
loadEnvironment(process.env.TOKENAI_ENV_FILE || join(homedir(), '.config/tokenai-agent/environment'));
const config = configuration();
const app = await buildApp(config);
await app.listen({ host: config.host, port: config.port });
console.log('TokenAI listening on ' + config.host + ':' + config.port);
app.services.tokenx.connect().catch(() => {});
for (const signal of ['SIGTERM','SIGINT']) process.once(signal, async () => { await app.close(); process.exit(0); });
