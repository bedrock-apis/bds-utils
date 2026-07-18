import { existsSync } from 'node:fs';
import { glob, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
   TaskConcurrencyChannel,
   FileDatabaseStructure,
   DirectoryDatabaseStructure,
   type DataSource,
} from '../../../utils';
import { BaseInstallationManager } from '../base';
import { Manifest, type ManifestLike, type PackageType } from './manifest';

export interface ResourceInfo {
   uuid: string;
   version: string;
}
export class DataManager extends BaseInstallationManager {
   protected readonly sources: Map<string, PackageGeneralInfo> = new Map();

   /**
    * Scans the installation directory for behavior and resource packs.
    * Populates the internal registry of installed packages.
    */
   public override async load(): Promise<void> {
      const channel = new TaskConcurrencyChannel(10);
      const folders = [
         'behavior_packs',
         'development_behavior_packs',
         'resource_packs',
         'development_resource_packs',
      ];

      const process = async (path: string): Promise<void> => {
         const manifest = await readFile(path)
            .then(_ => JSON.parse(_.toString()) as ManifestLike)
            .catch(_ => null);
         if (!manifest) return;
         this.addSource(manifest, path);
      };

      for (const folder of folders) {
         const pattern = join(this.installation.directory, folder, '*/manifest.json');

         // oxlint-disable-next-line no-await-in-loop
         for await (const manifestPath of glob(pattern)) await channel.push(process(manifestPath));
      }

      await channel.getAwaiter();
   }

   /**
    * Saves data manager state (not applicable for pack files).
    */
   public override async save(): Promise<void> {}

   /**
    * Imports a data package (McPack, Addon, Zip) into the installation.
    * Automatically handles distribution into behavior/resource pack folders.
    * @param source The data source (URL, File path, etc).
    */
   public async import(source: DataSource): Promise<ResourceInfo[]> {
      const results: ResourceInfo[] = [];
      for (const pkg of await DataManager.resolve(source)) {
         const { manifest, data, type } = pkg;
         const folder = join(
            this.installation.directory,
            type === 'behavior_pack' ? 'development_behavior_packs' : 'development_resource_packs',
            `${manifest.header.uuid}_${Manifest.getVersionString(manifest.header.version)}`
         );
         results.push({
            uuid: manifest.header.uuid,
            version: Manifest.getVersionString(manifest.header.version),
         });
         if (existsSync(folder)) {
            console.warn(
               `warn: Pack ${basename(folder)}(${manifest.header.name}) is already installed, please change version or remove it from current installation.`
            );
            continue;
         }

         // oxlint-disable-next-line no-await-in-loop
         const mirrored = await data.mirror(new DirectoryDatabaseStructure(folder)).catch(_ => null);
         if (mirrored === null) throw new Error(`Failed to extract pack to: ${folder}`);

         this.addSource(manifest, folder)!;
      }
      return results;
   }

   public async clear(): Promise<void> {
      await Promise.all(
         ['development_behavior_packs', 'development_resource_packs'].map(_ =>
            rm(_, { recursive: true }).catch(_ => null)
         )
      );
      this.sources.clear();
      await this.load();
   }

   /**
    * Checks if a package with the given UUID is already installed.
    * @param uuid The package UUID.
    */
   public has(uuid: string): boolean {
      return this.sources.has(uuid);
   }

   /**
    * Resolves a data source into one or more DataPackage instances.
    * Analyzes manifests to identify package types.
    * @param source The data source to resolve.
    */
   public static async resolve(source: DataSource): Promise<DataPackage[]> {
      const database = await FileDatabaseStructure.fromAny(source);
      const analyzed = await this.analyze(database).catch(_ => null);
      if (!analyzed) throw new Error('Failed to analyze package');
      return analyzed;
   }

   protected static async analyze(database: FileDatabaseStructure): Promise<DataPackage[]> {
      const keys = await database.keys();
      const packages: DataPackage[] = [];

      for (const key of keys) {
         if (key.endsWith('manifest.json')) {
            const path = key.substring(0, key.length - 'manifest.json'.length);
            // oxlint-disable-next-line no-await-in-loop
            const content = await database.get(key);
            if (content) {
               try {
                  const m = JSON.parse(new TextDecoder().decode(content)) as ManifestLike;
                  const kind = Manifest.determinePackType(m);
                  if (!kind) {
                     console.log(
                        'Internal(Failed to obtain package type from manifest): \n' +
                           JSON.stringify(m, null, 3)
                     );
                     continue;
                  }
                  // oxlint-disable-next-line no-await-in-loop
                  packages.push({ data: await database.substructure(path), manifest: m, type: kind });
               } catch {
                  console.error(new ReferenceError());
                  /* ignore invalid json */
               }
            }
         }
      }

      return packages;
   }

   protected addSource(manifest: ManifestLike, path: string): PackageGeneralInfo | null {
      const type = Manifest.determinePackType(manifest);
      if (!type) return null;
      const data: PackageGeneralInfo = this.sources.get(manifest.header.uuid) ?? {
         type: type,
         uuid: manifest.header.uuid,
         versions: [],
         path,
      };
      data.versions.push(manifest.header.version);
      this.sources.set(data.uuid, data);
      return data;
   }
}

export type SourceType = PackageType | 'addon' | 'world' | 'unknown';
export interface DataPackage {
   readonly data: FileDatabaseStructure;
   readonly type: PackageType;
   readonly manifest: ManifestLike;
}
export interface PackageGeneralInfo {
   type: PackageType;
   uuid: string;
   versions: ManifestLike['header']['version'][];
   path: string;
}
