import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { CONFIG_PERMISSIONS_FILE_NAME, DEFAULT_CONFIG_DIR_PATH } from '../constants';
import { BaseInstallationManager } from './base';

export class ConfigPermissionsManager extends BaseInstallationManager {
   protected readonly allowedModules: Set<string> = new Set();
   protected readonly modulePermissions: Record<string, unknown> = Object.create(null);

   /**
    * Loads module and permission configurations from the permissions.json file.
    */
   public override async load(): Promise<void> {
      const file = join(this.installation.directory, DEFAULT_CONFIG_DIR_PATH, CONFIG_PERMISSIONS_FILE_NAME);
      const config = await readFile(file)
         .then(_ => JSON.parse(_.toString('utf8')))
         .catch(_ => null);
      if (!config) return;
      if (typeof config !== 'object') return;
      if (Array.isArray(config.allowed_modules))
         for (const m of config.allowed_modules) if (typeof m === 'string') this.allowedModules.add(m);

      // I want to iterate it on my own, just in case if it had like symbols
      if (typeof config.module_permissions === 'object')
         for (const key of Object.getOwnPropertyNames(config.module_permissions))
            this.modulePermissions[key] = config.module_permissions[key];
   }

   /**
    * Saves current module and permission configurations to the permissions.json file.
    */
   public override async save(): Promise<void> {
      const file = join(this.installation.directory, DEFAULT_CONFIG_DIR_PATH, CONFIG_PERMISSIONS_FILE_NAME);
      await mkdir(dirname(file), { recursive: true }).catch(_ => null);
      await writeFile(
         file,
         JSON.stringify(
            { allowed_modules: Array.from(this.allowedModules), module_permissions: this.modulePermissions },
            null,
            3
         )
      ).catch(_ => null);
   }

   /**
    * Adds one or more modules to the allow list.
    * @param moduleNames Names of modules to allow (e.g., '@minecraft/server-net').
    */
   public setAllowed(moduleNames: RecommendedModuleName[]): this {
      this.allowedModules.clear();
      for (const moduleName of moduleNames) this.allowedModules.add(moduleName.toLowerCase());
      return this;
   }

   /**
    * Checks if a module is currently allowed.
    * @param moduleName The module name to check.
    */
   public isAllowed(moduleName: RecommendedModuleName): boolean {
      return this.allowedModules.has(moduleName.toLowerCase());
   }

   /**
    * Retrieves all currently allowed modules.
    */
   public getAllowed(): RecommendedModuleName[] {
      return Array.from(this.allowedModules) as RecommendedModuleName[];
   }

   /**
    * Configures specific options for a module (e.g., networking limits).
    * @param moduleName The module to configure.
    * @param configuration The configuration object or null to remove it.
    * @deprecated This function is still experimental and might be out of date
    */
   public setConfiguration<T extends keyof ConfigurationOptions>(
      moduleName: T,
      configuration: ConfigurationOptions[T] | null
   ): void {
      if (configuration === null) delete this.modulePermissions[moduleName.toLowerCase()];
      else this.modulePermissions[moduleName.toLowerCase()] = configuration;
   }

   /**
    * Retrieves the current configuration for a specific module.
    * @param moduleName The module name.
    * @returns A clone of the configuration object or null.
    * @deprecated This function is still experimental and might be out of date
    */
   public getConfiguration<T extends keyof ConfigurationOptions>(
      moduleName: T
   ): ConfigurationOptions[T] | null {
      const value = this.modulePermissions[moduleName.toLowerCase()] ?? null;
      if (value === null) return null;

      // Let's clone the object
      return JSON.parse(JSON.stringify(value));
   }
}

export type RecommendedModuleName =
   | '@minecraft/common'
   | '@minecraft/debug-utilities'
   | '@minecraft/diagnostics'
   | '@minecraft/server'
   | '@minecraft/server-ui'
   | '@minecraft/server-gametest'
   | '@minecraft/server-graphics'
   | '@minecraft/server-net'
   | '@minecraft/server-admin'
   | '@minecraft/server-editor'
   | '@minecraft/server-debug'
   | (`@minecraft/${string}` & {});

/** @deprecated This type is still experimental and might be out of date*/
export type ConfigurationOptions = {
   '@minecraft/server-net':
      | {
           allowed_uris: string[];
           force_https: boolean;
           max_body_bytes: number;
           max_concurrent_requests: number;
           session_headers: Record<string, string>;
        }
      | object;
} & {
   [t in RecommendedModuleName]: object;
};
