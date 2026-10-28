import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({ entryPoints: [fileURLToPath(new URL('./markdown.mjs', import.meta.url))], outfile: fileURLToPath(new URL('../../tokenai-markdown.js', import.meta.url)), bundle: true, platform: 'browser', format: 'iife', target: ['es2020'], minify: true, legalComments: 'eof' });
