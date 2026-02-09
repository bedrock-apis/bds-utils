import type { RolldownOptions } from 'rolldown';

import { writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dts } from 'rolldown-plugin-dts';

import RAW_MANIFEST from './package.json' with { type: 'json' };
const MANIFEST = Object.assign({}, RAW_MANIFEST);

const EXPORTS: Record<string, any> = ((MANIFEST as any)['exports'] = {});
const input: Record<string, string> = {};
for (const dir of await readdir('./submodules', { withFileTypes: true })) {
   if (!dir.isDirectory()) continue;
   EXPORTS['./' + dir.name] = {
      default: './dist/' + dir.name + '.js',
      types: './dist/' + dir.name + '.d.ts',
   };
   input[dir.name] = './submodules/' + dir.name + '/index.ts';
}
EXPORTS['.'] = { default: './dist/main.js', types: './dist/main.d.ts' };
input['main'] = './submodules/index.ts';
writeFileSync(resolve(import.meta.dirname, './package.json'), JSON.stringify(MANIFEST, null, 2));
export default {
   input,
   plugins: [dts({ tsgo: true })],
   external: /^(node:|unzip-web-stream)/,
   output: { cleanDir: true, dir: './dist/' },
} as RolldownOptions;
