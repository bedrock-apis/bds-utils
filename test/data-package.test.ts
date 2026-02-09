import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { DataPackage } from '../submodules/data';

const TEST_DIR = resolve(import.meta.dirname ?? __dirname, 'temp_test_data_pkg');
const PACK_DIR = join(TEST_DIR, 'test_bp');

describe('DataPackage', () => {
   beforeAll(async () => {
      if (existsSync(TEST_DIR)) await rm(TEST_DIR, { recursive: true, force: true });
      await mkdir(PACK_DIR, { recursive: true });
   });

   afterAll(async () => {
      await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
   });

   it('should detect behavior pack from directory', async () => {
      const uuid = '12345678-1234-1234-1234-1234567890ab';
      const manifest = {
         format_version: 2,
         header: { name: 'Test BP', uuid: uuid, version: [1, 0, 0], min_engine_version: [1, 16, 0] },
         modules: [{ type: 'data', uuid: 'abcdef12-1234-1234-1234-1234567890ab', version: [1, 0, 0] }],
      };
      await writeFile(join(PACK_DIR, 'manifest.json'), JSON.stringify(manifest));
      await writeFile(join(PACK_DIR, 'pack_icon.png'), 'dummy content');

      const pkg = await DataPackage.load(PACK_DIR);
      expect(pkg.type).toBe('behavior_pack');
      expect(pkg.manifests.length).toBe(1);
      expect(pkg.manifests[0].header.uuid).toBe(uuid);
   });

   it('should extract to development_behavior_packs', async () => {
      const pkg = await DataPackage.load(PACK_DIR);
      const bdsDir = join(TEST_DIR, 'bds');
      await mkdir(bdsDir, { recursive: true });

      const results = await pkg.extractTo(bdsDir);
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('behavior_pack');
      expect(results[0].path).toContain('development_behavior_packs');

      const extractedJsonPath = join(bdsDir, results[0].path, 'manifest.json');

      expect(existsSync(extractedJsonPath)).toBe(true);
      const content = await readFile(extractedJsonPath, 'utf8');
      expect(content).toContain('Test BP');
   });
});
