import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { UnzipStreamConsumer } from "unzip-web-stream";
import { spawn } from "node:child_process";
import { Writable } from "node:stream";
import type { DataPacksOptions, TestConfigOptions } from "./types";
import { ConfigPermissions } from "./config-permissions";
import { ServerProperties } from "./properties";
import { TEST_CONFIG_FILE_NAME } from "./constants";
import { BedrockDedicatedServerProcess } from "./process";

export class Installation {
   /** Installation directory */
   public readonly directory: string;
   /** Server Properties, file referenced */
   public readonly properties: ServerProperties;
   public readonly configPermissions: ConfigPermissions;
   public constructor(installationDirectory: string) {
      this.directory = resolve(installationDirectory);
      this.properties = new ServerProperties(
         resolve(this.directory, "server.properties"),
      );
      this.configPermissions = new ConfigPermissions(
         resolve(this.directory, "config/default/permissions.json"),
      );
   }
   public async include(dataPacks: DataPacksOptions): Promise<void>{
      //TODO - Implement
   }
   // Install from zip-file source
   public async install(stream: ReadableStream<Uint8Array>): Promise<this> {
      const tasks = new Set();

      // Unzip the stream on the fly
      await stream.pipeTo(
         new UnzipStreamConsumer({
            onFile: async (report, readable) => {
               const path = resolve(this.directory, report.path);
               if (!path.startsWith(this.directory))
                  throw new ReferenceError(
                     "Security critical path provided: " + report.path,
                  );

               if (!existsSync(dirname(path)))
                  await mkdir(dirname(path), { recursive: true });
               const task = readable
                  .pipeTo(Writable.toWeb(createWriteStream(path)))
                  .then((_) =>
                     report.path === "bedrock_server" ? chmod(path, 0o755) : null,
                  )
                  .then(
                     (_) => void tasks.delete(task),
                     (_) => void 0,
                  );
               tasks.add(task);
            },
         }),
      );

      //Make sure all files are properly closed and finished
      await Promise.all(tasks);
      return this.load();
   }
   // URL helper
   public async installFromURL(url: string | URL): Promise<this> {
      const response = await fetch(url).catch((_) => null);
      if (!response || !response.ok)
         throw new ReferenceError("Failed to fetch resource from: " + url);
      const body = response.body;
      if (!body)
         throw new ReferenceError("Failed to fetch resource data: " + url);
      return this.install(body);
   }
   public async load(): Promise<this> {
      await this.properties.load(); // Its always good to load the properties once
      await this.configPermissions.load();
      return this;
   }
   public async runWithTestConfig(config: TestConfigOptions | Record<string, any>, args: string[] | null): Promise<BedrockDedicatedServerProcess>{
      await writeFile(join(this.directory, TEST_CONFIG_FILE_NAME), JSON.stringify(config));
      return await this.runInternal(args);
   }
   public async run(args: string[] | null): Promise<BedrockDedicatedServerProcess> {
      await rm(join(this.directory, TEST_CONFIG_FILE_NAME)).catch(_=>null);
      return this.runInternal(args);
   }
   public getExecutableFile(): string | null {
      const exePath = join(this.directory, "bedrock_server");
      if (existsSync(exePath)) return exePath;
      if (existsSync(exePath + ".exe")) return exePath + ".exe";
      return null;
   }
   protected async runInternal(args: string[] | null): Promise<BedrockDedicatedServerProcess>{
      const exe = this.getExecutableFile();
      if (!exe)
         throw new ReferenceError(
            "Corrupted installation, failed to found executable",
         );
      await this.properties.save();
      await this.configPermissions.save();
      const process = spawn(exe, args??[], {
         cwd: this.directory,
         stdio: ["pipe"],
      });
      return BedrockDedicatedServerProcess.from(process);
   }
}