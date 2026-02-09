import type { SpecificVersionOptions, VersionOptions } from '../links';

export type ReleaseTag = 'latest' | `${number}.${number}.${number}.${number}`;
export interface CachedInstallerOptions {
   installationDirectory: string;
   installationCacheDir: string;
   fallbackVersionOptions: Partial<SpecificVersionOptions> & VersionOptions;
   usePreview?: boolean;
}
