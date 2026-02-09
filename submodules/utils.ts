import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { UnzipStreamConsumer } from 'unzip-web-stream';

export type DataSource = string | URL | Request | Response | ReadableStream<Uint8Array> | Uint8Array;
export class Utils {
   private constructor() {}

   public static async fromAny(source: DataSource): Promise<ReadableStream> {
      let stream: ReadableStream<Uint8Array> | null = null;
      if (typeof source === 'string') {
         // treat as URL or filesystem path
         if (source.startsWith('http://') || source.startsWith('https://'))
            stream = await this.streamFromFetch(source);
         else {
            let path = source;
            if (path.startsWith('file://')) path = fileURLToPath(path);
            // file URL
            const st = await stat(path).catch(_ => null);
            if (!st) throw new Error(`Failed to get stats for path: ${path}`);
            if (st.isFile()) stream = await this.fromFilePathToStream(path);
            else throw new Error(`Can not get source from IO thats not file: ${path}`);
         }
      } else if (source instanceof URL) {
         if (source.protocol === 'file:') stream = await this.fromFilePathToStream(source.href);
         else stream = await this.streamFromFetch(source);
      } else if (source instanceof Request || source instanceof Response)
         stream = await this.streamFromFetch(source as unknown as string | URL | Request | Response);
      else if (source instanceof ReadableStream) stream = source;
      else if (source instanceof Uint8Array) stream = new Response(source as BodyInit).body!;
      else throw new Error('Unknown source type');

      return stream;
   }

   public static async fromReadableStream(
      readable: ReadableStream<Uint8Array>
   ): Promise<FileDatabaseStructure> {
      return await MemoryDatabaseStructure.fromStream(readable);
   }

   public static async fromFilePathToStream(path: string): Promise<ReadableStream<Uint8Array>> {
      if (path.startsWith('file:///')) path = fileURLToPath(path);
      const nodeStream = createReadStream(path, { highWaterMark: 64 * 1024 });
      return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
   }

   public static async streamFromFetch(
      input: string | URL | Request | Response
   ): Promise<ReadableStream<Uint8Array>> {
      let res: Response | null = null;
      if (typeof input === 'string') res = await fetch(input).catch(_ => null);
      else if (input instanceof URL) res = await fetch(input.toString()).catch(_ => null);
      else if (input instanceof Request) res = await fetch(input).catch(_ => null);
      else if (input instanceof Response) res = input;

      if (!res || !res.ok || !res.body) throw new Error(`Failed to fetch package from ${String(input)}`);
      return res.body;
   }
}
export class TaskConcurrencyChannel {
   public readonly stack: Set<Promise<void>> = new Set();
   public readonly concurrency: number;
   public constructor(maxConcurrency: number) {
      this.concurrency = maxConcurrency;
   }
   public async push(task: PromiseLike<unknown>): Promise<void> {
      const promise = Promise.resolve(task).then(
         _ => void this.stack.delete(promise),
         _ => void null
      );
      this.stack.add(promise);
      if (this.stack.size >= this.concurrency) await Promise.any(this.stack);
   }
   public getAwaiter(): Promise<void> {
      return Promise.all(this.stack).then(_ => void null);
   }
}

export abstract class FileDatabaseStructure {
   protected readonly cache: Map<string, Uint8Array> = new Map();
   public abstract get(path: string): Promise<Uint8Array | null>;
   public abstract set(path: string, data: Uint8Array): Promise<void>;
   public abstract delete(path: string): Promise<boolean>;
   public abstract keys(): Promise<string[]>;
   protected correction(key: string): string {
      key = key.replaceAll('\\', '/');
      if (!key.startsWith('/')) return `/${key}`;
      return key;
   }
   public abstract substructure(path: string): Promise<FileDatabaseStructure>;
   public async mirror(destination: FileDatabaseStructure, maxConcurrency: number = 10): Promise<void> {
      const channel = new TaskConcurrencyChannel(maxConcurrency ?? 10);
      for (const key of await this.keys())
         // oxlint-disable-next-line no-await-in-loop
         await channel.push(
            (async (): Promise<void> => {
               const data = await this.get(key);
               if (data) await destination.set(key, data);
            })()
         );
      await channel.getAwaiter();
   }

   public static async fromAny(source: DataSource): Promise<FileDatabaseStructure> {
      let stream: ReadableStream<Uint8Array> | null = null;
      let database: FileDatabaseStructure | null = null;

      if (typeof source === 'string') {
         // treat as URL or filesystem path
         if (source.startsWith('http://') || source.startsWith('https://'))
            stream = await Utils.streamFromFetch(source);
         else {
            let path = source;
            if (path.startsWith('file://')) path = fileURLToPath(path);
            // file URL
            const st = await stat(path).catch(_ => null);
            if (!st) throw new Error(`Failed to get stats for path: ${path}`);
            if (st.isDirectory()) database = new DirectoryDatabaseStructure(fileURLToPath(path));
            else stream = await Utils.fromFilePathToStream(path);
         }
      } else if (source instanceof URL) {
         if (source.protocol === 'file:') stream = await Utils.fromFilePathToStream(source.href);
         else stream = await Utils.streamFromFetch(source);
      } else if (source instanceof Request || source instanceof Response)
         stream = await Utils.streamFromFetch(source as unknown as string | URL | Request | Response);
      else if (source instanceof ReadableStream) stream = source;
      else if (source instanceof Uint8Array) stream = new Response(source as BodyInit).body!;
      else throw new Error('Unknown source type');

      if (!database) {
         if (!stream) throw new Error('Failed to obtain stream from source');
         database = await this.fromReadableStream(stream);
      }

      return database;
   }

   private static async fromReadableStream(
      readable: ReadableStream<Uint8Array>
   ): Promise<FileDatabaseStructure> {
      return await MemoryDatabaseStructure.fromStream(readable);
   }
}

export class MemoryDatabaseStructure extends FileDatabaseStructure {
   public async get(path: string): Promise<Uint8Array | null> {
      return this.cache.get(this.correction(path)) ?? null;
   }
   public async set(path: string, data: Uint8Array): Promise<void> {
      this.cache.set(this.correction(path), data);
   }
   public async delete(path: string): Promise<boolean> {
      path = this.correction(path);
      return this.cache.delete(path);
   }
   public async keys(): Promise<string[]> {
      return Array.from(this.cache.keys());
   }
   private constructor() {
      super();
   }
   public static async fromStream(readable: ReadableStream<Uint8Array>): Promise<MemoryDatabaseStructure> {
      const inmzs = new MemoryDatabaseStructure();
      const tasks = new Set();
      await readable.pipeTo(
         new UnzipStreamConsumer({
            // oxlint-disable-next-line explicit-function-return-type
            onFile: (report, readable) => {
               const task = new Response(readable).bytes().then(_ => {
                  inmzs.set(report.path, _);
                  tasks.delete(task);
               });
               tasks.add(task);
            },
         })
      );
      // Just to be sure
      await Promise.all(tasks);
      return inmzs;
   }
   public async substructure(path: string): Promise<MemoryDatabaseStructure> {
      path = this.correction(path);
      const db = new MemoryDatabaseStructure();
      for (const key of this.cache.keys())
         if (key.startsWith(path))
            db.cache.set(this.correction(key.substring(path.length)), this.cache.get(key)!);

      return db;
   }
}
export class DirectoryDatabaseStructure extends FileDatabaseStructure {
   public readonly directory: string;
   public constructor(directory: string) {
      if (directory.endsWith('/')) directory = directory.substring(0, directory.length - 1);
      super();
      this.directory = directory;
   }
   public async get(path: string): Promise<Uint8Array | null> {
      return await readFile(this.directory + this.correction(path)).catch(_ => null);
   }
   public async set(path: string, data: Uint8Array): Promise<void> {
      const full = this.directory + this.correction(path);
      await mkdir(dirname(full), { recursive: true }).catch(_ => null);
      await writeFile(this.directory + this.correction(path), data).catch(_ => null);
   }
   public async delete(path: string): Promise<boolean> {
      return await rm(this.directory + this.correction(path)).then(
         _ => true,
         _ => false
      );
   }
   public async keys(): Promise<string[]> {
      return await readdir(this.directory, { recursive: true, withFileTypes: true })
         .then(e => e.filter(_ => _.isFile()).map(e => this.correction(e.parentPath + e.name)))
         .catch(_ => []);
   }
   public async substructure(path: string): Promise<DirectoryDatabaseStructure> {
      path = this.directory + this.correction(path);
      await mkdir(path, { recursive: true }).catch(_ => null);
      return new DirectoryDatabaseStructure(path);
   }
}

export type EventsMap = Record<string | number, unknown>;
type Callback = (payload: unknown) => void;

abstract class Emitter<E extends EventsMap, T> {
   protected readonly target: Record<keyof E, T> = Object.create(null);
   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public abstract dispatch<K extends keyof E>(type: K, payload: E[K]): void;
}

export class EventEmitter<E extends EventsMap> extends Emitter<E, Array<Callback>> {
   /**
    * Add a listener for the specified event type.
    * @param type The event type.
    * @param listener The callback to invoke when the event is dispatched.
    */
   public add<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      const list = this.target[type] ?? (this.target[type] = []);
      list.push(listener as Callback);
   }

   /**
    * Remove a listener for the specified event type.
    * @param type The event type.
    * @param listener The callback to remove.
    */
   public remove<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      const list = this.target[type];
      if (!list) return;
      let i = list.indexOf(listener as Callback);
      if (i >= 0) this.target[type] = (list.splice(i, 1), list);
   }

   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public override dispatch<K extends keyof E>(type: K, payload: E[K]): void {
      const list = this.target[type];
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
         const func = list[i];
         func!(payload);
      }
   }
}

/**
 * Internal event emitter that supports only a single listener per event type.
 */
export class InternalEmitter<E extends EventsMap> extends Emitter<E, Callback> {
   /**
    * Set a listener for the specified event type, replacing any existing listener.
    * @param type The event type.
    * @param listener The callback to invoke when the event is dispatched.
    */
   public set<K extends keyof E>(type: K, listener: (payload: E[K]) => void): void {
      this.target[type] = listener as Callback;
   }

   /**
    * Delete the listener for the specified event type.
    * @param type The event type.
    * @returns True if the listener was deleted, false otherwise.
    */
   public delete<K extends keyof E>(type: K): boolean {
      return delete this.target[type];
   }
   /**
    * Dispatch an event of the given type with the provided payload.
    * @param type The event type.
    * @param payload The payload for the event.
    */
   public override dispatch<K extends keyof E>(type: K, payload: E[K]): void {
      const callback = this.target[type];
      callback?.(payload);
   }
}
