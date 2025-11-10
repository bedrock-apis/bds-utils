export const SERVICES_LATEST_DOWNLOAD_LINK: string = "https://net-secondary.web.minecraft-services.net/api/v1.0/download/links";
export const OSS_GIT_VERSIONS_ROOT: string = "https://raw.githubusercontent.com/Bedrock-OSS/BDS-Versions/main";
export const OSS_GIT_VERSIONS_FILE: string = `${OSS_GIT_VERSIONS_ROOT}/versions.json`;
export const CDN_DOMAIN: string = "https://www.minecraft.net/bedrockdedicatedserver";

export async function getLatestDownloadLinkFromServices(
   options: VersionOptions,
): Promise<string | null> {
   let DOWNLOAD_TYPE = "serverBedrock";
   if (options.preview) DOWNLOAD_TYPE += "Preview";
   switch (options.platform) {
      case "win32":
         DOWNLOAD_TYPE += "Windows";
         break;
      case "linux":
         DOWNLOAD_TYPE += "Linux";
         break;
      default:
         return null;
   }
   const response = await fetch(SERVICES_LATEST_DOWNLOAD_LINK).catch(
      (_) => null,
   );
   if (!response || !response.ok) return null;
   const DATA = await response.json().catch((_) => null);
   if (!DATA) return null;
   if (!DATA.result) return null;
   if (!Array.isArray(DATA.result.links)) return null;
   return (
      DATA.result.links.find((e: any) => e?.downloadType === DOWNLOAD_TYPE)
         ?.downloadUrl ?? null
   );
}

export async function getLatestDownloadLinkFromOSSGit(
   options: VersionOptions,
): Promise<string | null> {
   let platform = options.platform === "win32" ? "windows" : options.platform;
   const version = await getLatestBuildVersionFromOSS(options)
   if (!version) return null;
   const response = await fetch(
      `${OSS_GIT_VERSIONS_ROOT}/${platform}${options.preview ? "_preview" : ""}/${version}.json`,
   );
   if (!response || !response.ok) return null;
   const data = await response.json().catch((_) => null);
   if (!data) return null;
   return data.download_url ?? null;
}
/**
 * Hardcoded values are used, please avoid this function if possible
 * @deprecated
 */
export function getSpecificDownloadLinkManual(
   options: SpecificVersionOptions,
): string {
   return `${options.cdn_root ?? CDN_DOMAIN}/bin-${options.platform === "win32" ? "win" : options.platform}${options.preview ?? "-preview"}/bedrock-server-${options.version}.zip`;
}
export async function getLatestBuildVersionFromOSS(options: VersionOptions): Promise<string | null>{
   let platform = options.platform === "win32" ? "windows" : options.platform;
   let response = await fetch(OSS_GIT_VERSIONS_FILE).catch((_) => null);
   if (!response || !response.ok) return null;
   let data = await response.json().catch((_) => null);
   if (!data) return null;
   const version_set = data[platform];
   if (!version_set) return null;
   const version = version_set[options.preview ? "preview" : "stable"];
   return version??null;
}
export async function getSpecificDownloadLinkOSS(
   options: SpecificVersionOptions,
): Promise<string | null> {
   const platform = options.platform === "win32" ? "windows" : options.platform;
   const response = await fetch(
      `${OSS_GIT_VERSIONS_ROOT}/${platform}${options.preview ? "_preview" : ""}/${options.version}.json`,
   ).catch((_) => null);
   if (!response || !response.ok) return null;
   const data = await response.json().catch((_) => null);
   if (!data) return null;
   return data.download_url ?? null;
}
export interface VersionOptions {
   platform: "win32" | "linux"; // Mojang supports only two platforms at the moment
   preview: boolean;
}
export interface SpecificVersionOptions extends VersionOptions {
   version: string;
   /**
    * Don't relay on this feature too much, it's never good to hardcode this unless you know what you are doing.
    */
   cdn_root?: string; // You shouldn't rely on this too much
}

export function getLatestDownloadLink(options: VersionOptions): Promise<string | null>{
   return getLatestDownloadLinkFromOSSGit(options).then(_=>_??getLatestDownloadLinkFromServices(options));
}
export function getFileNameFromLink(link: string): string{
   const lastIndexOf = link.lastIndexOf("/");
   if(lastIndexOf === -1)
      return link;
   return link.substring(lastIndexOf + 1);
}
export async function getLatestFileNameVersion(options: VersionOptions): Promise<string | null>{
   const link = await getLatestDownloadLink(options);
   if(!link)
      return null;
   return getFileNameFromLink(link); 
}