import type { SpecificVersionOptions, VersionOptions } from "../links";
export interface TestConfigOptions {
    next_update?: boolean;
    generate_all?: boolean;
    generate_documentation?: boolean;
    generate_api_metadata?: boolean;
}
export interface DataPacksOptions {
    behaviorPacks?: DataSource[];
    resourcePacks?: DataSource[];
    //addons?: DataSource[];
}
export interface DataSource {
    manifest: {
        uuid: string,
        version: string | number[]
    },
    source: string;
}