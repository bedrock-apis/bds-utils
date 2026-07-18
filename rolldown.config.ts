import type { RolldownOptions } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

export default {
   input: {
      main: './submodules/mod.ts',
      install: './submodules/install/index.ts',
      cached: './submodules/cached/index.ts',
      links: './submodules/links/index.ts',
      process: './submodules/process/index.ts',
   },
   plugins: [dts()],
   external: /^(node:|unzip-web-stream)/,
   output: { cleanDir: true, dir: './dist/' },
} as RolldownOptions;
