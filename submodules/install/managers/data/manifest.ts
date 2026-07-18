export type Version = string | [number, number, number];
export type PackageType = 'behavior_pack' | 'resource_pack';
export interface ManifestLike {
   format_version: number;
   header: {
      name: string;
      description?: string;
      uuid: string;
      version: Version;
      min_engine_version: [number, number, number];
   };
   modules: Array<{
      type: 'script' | 'resources' | 'data';
      uuid: string;
      entry?: string;
      description?: string;
      version: Version;
   }>;
   capabilities?: string[];
   dependencies?: Array<{ uuid: string; version: Version } | { module_name: string; version: Version }>;
}

/**
 * Utility class for interacting with Minecraft manifest files.
 */
export abstract class Manifest {
   private constructor() {}

   /**
    * Converts a version array or string into a standardized dot-separated string.
    * @param version The version to convert.
    */
   public static getVersionString(version: Version): string {
      return Array.isArray(version) ? version.join('.') : String(version);
   }

   /**
    * Determines if a package is a behavior pack or resource pack based on its manifest modules.
    * @param manifest The manifest object to analyze.
    * @returns The identified PackageType or null if undetermined.
    */
   public static determinePackType(manifest: ManifestLike): PackageType | null {
      if (manifest.modules?.some(m => m.type === 'data' || m.type === 'script')) return 'behavior_pack';
      if (manifest.modules?.some(m => m.type === 'resources')) return 'resource_pack';
      return null;
   }
}
