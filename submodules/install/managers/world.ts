import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
   WORLD_BEHAVIOR_PACKS_FILE_NAME,
   WORLD_RESOURCE_PACKS_FILE_NAME,
   WORLDS_DIR_NAME,
} from '../constants';
import { BaseInstallationManager } from './base';
import { ResourceInfo } from './data';

const LEVELNAME_FILE = 'levelname.txt';

export interface WorldInfo {
   levelName: string;
   worldName: string;
   path: string;
}
export class WorldsManager extends BaseInstallationManager {
   protected readonly worldsByLevelName: Map<string, WorldInfo> = new Map();

   /**
    * Scans the worlds directory and loads all existing worlds into memory.
    */
   public override async load(): Promise<void> {
      const worldsFolder = join(this.installation.directory, WORLDS_DIR_NAME);
      await mkdir(worldsFolder).catch(_ => null);
      for (const levelName of await readdir(worldsFolder, { withFileTypes: true })) {
         if (!levelName.isDirectory()) continue;
         // oxlint-disable-next-line no-await-in-loop
         await this.addLevel(levelName.name);
      }
   }

   /**
    * Saves current world manager state (not applicable for world files themselves).
    */
   public override async save(): Promise<void> {}

   /**
    * Retrieves world information by its level name (folder name).
    * @param name The level name to look up.
    * @returns WorldInfo if found, or null if the world doesn't exist.
    */
   public async getByLevelName(name: string): Promise<WorldInfo | null> {
      const worldPath = join(this.installation.directory, WORLDS_DIR_NAME, name);
      if (!existsSync(worldPath)) return null;

      let levelInfo = this.worldsByLevelName.get(name);
      if (levelInfo) return levelInfo;

      return this.addLevel(name);
   }

   /**
    * Creates a new empty world with the specified level name.
    * @param name The name of the new world (folder name).
    * @returns The created WorldInfo.
    * @throws ReferenceError if the world already exists.
    */
   public async create(name: string, options?: CreateWorldOptions): Promise<WorldInfo> {
      const worldPath = join(this.installation.directory, WORLDS_DIR_NAME, name);
      if (existsSync(worldPath)) throw new ReferenceError('This world already exists: ' + name);
      await mkdir(worldPath, { recursive: true });
      await writeFile(join(worldPath, LEVELNAME_FILE), name);
      if (options) {
         await writeFile(
            join(worldPath, 'level.dat'),
            CreateLevelDat(['experiments_ever_used', ...new Set(['gametest', ...options.experiments])])
         );
         await writeFile(
            join(worldPath, 'level2.dat'),
            CreateLevelDat(['experiments_ever_used', ...new Set(['gametest', ...options.experiments])])
         );
         await writeFile(
            join(worldPath, WORLD_BEHAVIOR_PACKS_FILE_NAME),
            JSON.stringify(
               options.behavior_packs.map(e => ({ pack_id: e.uuid, version: e.version })),
               null,
               3
            )
         );
         await writeFile(
            join(worldPath, WORLD_RESOURCE_PACKS_FILE_NAME),
            JSON.stringify(
               options.resource_packs.map(e => ({ pack_id: e.uuid, version: e.version })),
               null,
               3
            )
         );
      }
      return { levelName: name, path: worldPath, worldName: name };
   }

   /**
    * Deletes a world and its files from the installation.
    * @param worldInfo Information about the world to delete.
    */
   public async delete(worldInfo: WorldInfo): Promise<void> {
      this.worldsByLevelName.delete(worldInfo.levelName);
      await rm(worldInfo.path, { recursive: true, force: true }).catch(_ => null);
   }

   /**
    * Updates server properties to make the specified world active on next boot.
    * @param worldInfo Information about the world to set as active.
    */
   public setWorldActiveInProperties(worldInfo: WorldInfo): void {
      this.installation.properties.set('level-name', worldInfo.levelName);
   }

   protected async addLevel(name: string): Promise<WorldInfo> {
      const worldsFolder = join(this.installation.directory, WORLDS_DIR_NAME);
      const path = join(worldsFolder, name);
      const it = {
         levelName: name,
         path: path,
         worldName: await readFile(join(path, LEVELNAME_FILE))
            .then(_ => _.toString().trim())
            .catch(_ => name),
      };
      this.worldsByLevelName.set(name, it);
      return it;
   }
}

export type Experiments =
   | 'gametest'
   | 'data_driven_vanilla_blocks_and_items'
   | 'upcoming_creator_features'
   | 'voxel_shapes'
   | (string & {});
export interface CreateWorldOptions {
   behavior_packs: ResourceInfo[];
   resource_packs: ResourceInfo[];
   experiments: Experiments[];
}

// Sometimes the ugly code does the job batter than anything else, so please leave it as is, do we really need NBT bloat to deal with this simple file?
export function CreateLevelDat(experiments: string[]): Uint8Array {
   const writeString = (info: Uint8Array): void => {
      view.setUint16(offset, info.length, true);
      offset += 2;
      buffer.set(info, offset);
      offset += info.length;
   };
   const EXPERIMENTS = experiments.map(_ => new TextEncoder().encode(_));
   const buffer = new Uint8Array(
      EXPERIMENTS.map(_ => _.length).reduce((a, b) => a + b) + EXPERIMENTS.length * 8 + 32
   );
   const view = new DataView(buffer.buffer);
   let offset = 8;
   buffer[offset++] = 0x0a; //Mark as compound, ROOT
   buffer[offset++] = buffer[offset++] = 0; // Empty ROOT tag name

   buffer[offset++] = 0x0a; // Experiments compound
   //Name
   writeString(new TextEncoder().encode('experiments'));
   for (const experimentName of EXPERIMENTS) {
      buffer[offset++] = 0x01; // NBT BOOL
      writeString(experimentName);
      buffer[offset++] = 1; // Enabled
   }
   buffer[offset++] = 0x00; // End of compound
   buffer[offset++] = 0x00; // End of root compound

   // HEADER
   view.setUint32(0, 8, true);
   view.setUint32(4, offset - 8, true);
   return buffer.subarray(0, offset);
}
