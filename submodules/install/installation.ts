import { createWriteStream, existsSync } from 'node:fs';
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { platform } from 'node:process';
import { Writable } from 'node:stream';

import { UnzipStreamConsumer } from 'unzip-web-stream';

import {
   getLatestDownloadLink,
   getSpecificDownloadLinkOSS,
   type SpecificVersionOptions,
   type VersionOptions,
} from '../links';
import { BedrockDedicatedServerProcess } from '../process';
import { type DataSource, EventEmitter, Utils } from '../utils';
import { GRACE_PERIOD_DELAY, TEST_CONFIG_FILE_NAME } from './constants';
import { BaseInstallationManager } from './managers/base';
import { ConfigPermissionsManager } from './managers/config-permissions';
import { DataManager } from './managers/data';
import { ServerPropertiesManager } from './managers/properties';
import { WorldsManager } from './managers/world';

export enum DisposableMode {
   StopRunningServes,
   KillRunningServers,
   IgnoreRunningServers,
}
export interface InstallationOptions {
   /** Installation Director, must contain executable */
   directory: string;
   /**@default DisposableMode.StopRunningServers  */
   disposableMode?: DisposableMode;

   /**Time provided for processes to gracefully stops before we kill them  */
   gracePeriod?: number;
}
export class Installation implements AsyncDisposable {
   /** Installation directory */
   public readonly directory: string;
   /** Server Properties, file referenced */
   protected readonly managers: Set<BaseInstallationManager>;
   public readonly properties: ServerPropertiesManager;
   public readonly config: ConfigPermissionsManager;
   public readonly data: DataManager;
   public readonly worlds: WorldsManager;
   public readonly options: Readonly<Required<InstallationOptions>>;
   protected readonly processes: Set<BedrockDedicatedServerProcess> = new Set();
   public readonly events: EventEmitter<{
      dispose: null;
      processStart: { executable: string; args: string[] };
      processExit: { process: BedrockDedicatedServerProcess };
   }> = new EventEmitter();

   public static async From(options: InstallationOptions): Promise<Installation> {
      const inst = new this(options);
      if (inst.getExecutableFile()) await inst.load();
      return inst;
   }
   /**
    * Creates a new Installation instance
    * @param options - Installation configuration options
    */
   protected constructor(options: InstallationOptions) {
      this.options = {
         directory: options.directory,
         disposableMode: options.disposableMode ?? DisposableMode.StopRunningServes,
         gracePeriod: options.gracePeriod ?? GRACE_PERIOD_DELAY,
      };

      this.directory = resolve(this.options.directory);
      this.managers = new Set([
         (this.properties = new ServerPropertiesManager(this)),
         (this.config = new ConfigPermissionsManager(this)),
         (this.data = new DataManager(this)),
         (this.worlds = new WorldsManager(this)),
      ]);
   }
   public async ensureExecutable(fallback?: VersionOptions | SpecificVersionOptions): Promise<void> {
      if (this.getExecutableFile()) return void (await this.load());

      fallback ??= { platform: platform as 'win32', preview: false };

      let link: string | null;
      if (typeof (fallback as SpecificVersionOptions).version === 'string') {
         link = await getSpecificDownloadLinkOSS(fallback as SpecificVersionOptions);
      } else link = await getLatestDownloadLink(fallback);

      if (!link) throw new ReferenceError('Failed to found installation archive');

      await this.install(link);
   }
   /**
    * Installs Bedrock Dedicated Server from a zip file source
    * @param source - The data source containing the server files (zip, URL, buffer, etc.)
    * @returns A promise that resolves to this Installation instance after loading
    * @throws {ReferenceError} If a security-critical path is detected
    * @throws {Error} If installation is corrupted or missing after installation
    */
   // Install from zip-file source
   public async install(source: DataSource): Promise<this> {
      const stream = await Utils.fromAny(source);
      const tasks = new Set<Promise<void>>();

      // Unzip the stream on the fly
      await stream.pipeTo(
         new UnzipStreamConsumer({
            onFile: async (report, readable): Promise<void> => {
               const path = resolve(this.directory, report.path);
               if (!path.startsWith(this.directory))
                  throw new ReferenceError('Security critical path provided: ' + report.path);

               if (!existsSync(dirname(path))) await mkdir(dirname(path), { recursive: true });
               const task = readable
                  .pipeTo(Writable.toWeb(createWriteStream(path)))
                  .then(_ => (report.path === 'bedrock_server' ? chmod(path, 0o755) : null))
                  .then(
                     _ => void tasks.delete(task),
                     _ => void 0
                  );
               tasks.add(task);
               return void 0;
            },
         })
      );

      //Make sure all files are properly closed and finished
      await Promise.all(tasks);
      return this.load();
   }

   /**
    * Loads all managers and verifies the installation is valid
    * @returns A promise that resolves to this Installation instance
    * @throws {Error} If the installation is corrupted or missing the executable
    */
   public async load(): Promise<this> {
      if (!this.getExecutableFile()) throw new Error("Can't load corrupted or missing installation");
      await Promise.all(Array.from(this.managers).map(_ => _.load()));
      return this;
   }

   /**
    * Runs the server with a test configuration file
    * @param config - Test configuration object to write to the config file
    * @param args - Optional command-line arguments to pass to the server
    * @returns A promise that resolves to the running BedrockDedicatedServerProcess
    */
   public async runWithTestConfig(
      config: TestConfigOptions | Record<string, any>,
      args: string[] | null
   ): Promise<BedrockDedicatedServerProcess> {
      await writeFile(join(this.directory, TEST_CONFIG_FILE_NAME), JSON.stringify(config));
      return await this.runInternal(args);
   }

   /**
    * Runs the server with the default configuration
    * @param args - Optional command-line arguments to pass to the server
    * @returns A promise that resolves to the running BedrockDedicatedServerProcess
    */
   public async run(args: string[] | null): Promise<BedrockDedicatedServerProcess> {
      await rm(join(this.directory, TEST_CONFIG_FILE_NAME)).catch(_ => null);
      return this.runInternal(args);
   }

   /**
    * Gets the path to the server executable
    * @returns The full path to the executable (bedrock_server or bedrock_server.exe), or null if not found
    */
   public getExecutableFile(): string | null {
      const exePath = join(this.directory, 'bedrock_server');
      if (existsSync(exePath)) return exePath;
      if (existsSync(exePath + '.exe')) return exePath + '.exe';
      return null;
   }
   protected async runInternal(args: string[] | null): Promise<BedrockDedicatedServerProcess> {
      const exe = this.getExecutableFile();
      if (!exe) throw new ReferenceError('Corrupted installation, failed to found executable');
      await Promise.all(Array.from(this.managers).map(_ => _.save()));
      // Dispatch beforeStart event
      try {
         this.events.dispatch('processStart', { executable: exe, args: args ?? [] });
      } catch {}
      const process = await BedrockDedicatedServerProcess.run(exe, args ?? [], this.directory);
      this.processes.add(process);
      // Dispatch exit event after process exits
      process
         .wait()
         .finally(() => {
            this.processes.delete(process);
            this.events.dispatch('processExit', { process });
         })
         .catch(_ => null);
      return process;
   }
   /**
    * Implements async disposable apis
    * @returns Promise<void>
    */
   public async [Symbol.asyncDispose](): Promise<void> {
      if (!this.processes.size) return;
      if (this.options.disposableMode === DisposableMode.IgnoreRunningServers) return;
      const tasks = Array.from(this.processes.values()).map(e => {
         if (this.options.disposableMode === DisposableMode.KillRunningServers) return e.kill();

         return e.stop(true, this.options.gracePeriod);
      });

      await Promise.allSettled(tasks);
      try {
         this.events.dispatch('dispose', null);
      } catch {}
   }
}

export interface TestConfigOptions {
   next_update?: boolean;
   generate_all?: boolean;
   generate_documentation?: boolean;
   generate_api_metadata?: boolean;
}
