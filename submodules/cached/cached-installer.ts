import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';

import { Installation } from '../install';
import {
   getFileNameFromLink,
   getLatestDownloadLink,
   getSpecificDownloadLinkOSS,
   type SpecificVersionOptions,
} from '../links';
import type { CachedInstallerOptions } from './types';

export class CachedInstaller {
   private constructor() {}
   public static async ensure(options: CachedInstallerOptions): Promise<Installation | null> {
      const cacheDir = resolve(options.installationCacheDir);
      if (!existsSync(cacheDir)) {
         if (
            !(await mkdir(cacheDir, { recursive: true }).then(
               _ => true,
               _ => false
            ))
         )
            throw new ReferenceError('Failed to create cache dir');
      }

      const installDir = resolve(options.installationDirectory);
      if (!existsSync(installDir)) {
         if (
            !(await mkdir(installDir, { recursive: true }).then(
               _ => true,
               _ => false
            ))
         )
            throw new ReferenceError('Failed to create installation dir');
      }

      const installation = await Installation.From({ directory: installDir });

      const dOptions = options.fallbackVersionOptions;
      let link = await (dOptions.version
         ? getSpecificDownloadLinkOSS(dOptions as SpecificVersionOptions)
         : getLatestDownloadLink(dOptions));

      if (!link) {
         const versions = (await readdir(cacheDir, { withFileTypes: true })).filter(
            e => e.isFile() && e.name.endsWith('zip')
         );
         if (dOptions.version) {
            const exactMatch = versions.find(e => e.name.includes(dOptions.version ?? ''));
            if (exactMatch)
               return await installation.install(
                  Readable.toWeb(
                     createReadStream(resolve(cacheDir, exactMatch.name))
                  ) as ReadableStream<Uint8Array>
               );
         }
         const one = versions.shift();
         if (one)
            return await installation.install(
               Readable.toWeb(createReadStream(resolve(cacheDir, one.name))) as ReadableStream<Uint8Array>
            );
      } else {
         const filename = getFileNameFromLink(link);
         const ffpath = resolve(cacheDir, filename);
         if (existsSync(ffpath))
            return await installation.install(
               Readable.toWeb(createReadStream(ffpath)) as ReadableStream<Uint8Array>
            );

         const response = await fetch(link).catch(_ => null);
         if (!response || !response.ok) return null;

         const readable = response.body!;
         const [source, file] = readable.tee();
         await Promise.all([
            installation.install(source),
            file.pipeTo(Writable.toWeb(createWriteStream(ffpath))),
         ]);
         return installation;
      }

      return null;
   }
}
