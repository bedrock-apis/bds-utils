import { expect, suite, test } from "vitest";
import {
   getLatestBuildVersionFromOSS,
   getLatestDownloadLinkFromOSSGit,
   getLatestDownloadLinkFromServices,
   getSpecificDownloadLinkManual,
   getSpecificDownloadLinkOSS,
   SpecificVersionOptions,
   VersionOptions,
} from ".";
suite("Latest Links Availability", () => {
   for (const current of [
      {
         method: getLatestDownloadLinkFromServices,
         options: { preview: true, platform: "win32" } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromServices,
         options: {
            preview: false,
            platform: "win32",
         } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromServices,
         options: { preview: true, platform: "linux" } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromServices,
         options: {
            preview: false,
            platform: "linux",
         } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromOSSGit,
         options: { preview: true, platform: "win32" } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromOSSGit,
         options: {
            preview: false,
            platform: "win32",
         } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromOSSGit,
         options: { preview: true, platform: "linux" } satisfies VersionOptions,
      },
      {
         method: getLatestDownloadLinkFromOSSGit,
         options: {
            preview: false,
            platform: "linux",
         } satisfies VersionOptions,
      },
   ])
      test(`${current.method.name} IsPreview: ${current.options.preview} Platform: ${current.options.platform}`, async () => {
         const link = await current.method(current.options);
         expect(link).not.toBe(null);
         expect(link).toBeTypeOf("string");
         expect(await isFile(link!));
      });
});
const PREVIEW_VERSION = "1.21.130.22";
const STABLE_VERSION = "1.21.114.1";
suite("Specific version Availability: Preview ", () => {
   for (const current of [
      {
         method: getSpecificDownloadLinkManual,
         options: {
            preview: false,
            platform: "win32",
            version: STABLE_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkManual,
         options: {
            preview: true,
            platform: "win32",
            version: PREVIEW_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkManual,
         options: {
            preview: false,
            platform: "linux",
            version: STABLE_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkManual,
         options: {
            preview: true,
            platform: "linux",
            version: PREVIEW_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkOSS,
         options: {
            preview: false,
            platform: "win32",
            version: STABLE_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkOSS,
         options: {
            preview: true,
            platform: "win32",
            version: PREVIEW_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkOSS,
         options: {
            preview: false,
            platform: "linux",
            version: STABLE_VERSION,
         } satisfies SpecificVersionOptions,
      },
      {
         method: getSpecificDownloadLinkOSS,
         options: {
            preview: true,
            platform: "linux",
            version: PREVIEW_VERSION,
         } satisfies SpecificVersionOptions,
      },
   ])
      test(`${current.method.name} IsPreview: ${current.options.preview} Platform: ${current.options.platform}`, async () => {
         const link = await current.method(current.options);
         expect(link).not.toBe(null);
         expect(link).toBeTypeOf("string");
         expect(await isFile(link!));
      });
});

suite("Get Latest Version", ()=>{
   for(const t of [
      {platform: "win32", preview: true},
      {platform: "win32", preview: false},
      {platform: "linux", preview: true},
      {platform: "linux", preview: false}
   ] satisfies VersionOptions[]) 
      test("Latest Version", async ()=>{
         expect(await getLatestBuildVersionFromOSS(t)).not.toBeNull();
      });
})
async function isFile(url: string): Promise<boolean> {
   const response = await fetch(url, { method: "HEAD" }).catch((_) => null);
   return response?.ok ?? false;
}
