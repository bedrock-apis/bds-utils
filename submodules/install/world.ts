import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { WORLD_BEHAVIOR_PACKS_FILE_NAME, WORLD_RESOURCE_PACKS_FILE_NAME } from "./constants";

export interface WorldInitializer {
    behaviorPacks?: WorldDataPackInformation[];
    resourcePacks?: WorldDataPackInformation[];
    options?: WorldInitializerOptions | Record<string, any>;
}
export interface WorldInitializerOptions {
    "level-name"?: string;
    "level-seed"?: number;
    isHardcode?: boolean;
    "gamemode"?: string;
    "difficulty": string;
}
export interface WorldDataPackInformation {
    uuid: string;
    version: string | number[];
}
export class WorldLevel {
    public readonly properties: Record<string, string | number | boolean> = {};
    public constructor(name: string) {
        this.name = name;
    }
    public readonly name: string;
}
export class WorldsFolderOptions {
    public readonly directory: string;
    public readonly worlds: Map<string, WorldLevel> = new Map;
    public constructor(worlds: string) {
        this.directory = worlds;
    }
    public async create(world: WorldInitializer): Promise<WorldLevel> {
        world.options ??= {};
        const folderName = join(this.directory, (world.options["level-name"] ??= crypto.randomUUID()));
        
        const ww = new WorldLevel(world.options["level-name"]);
        Object.assign(ww.properties, world.options);
        // Create the dir
        if(!existsSync(folderName))
            await mkdir(folderName);

        if(world.behaviorPacks)
            await writeFile(join(folderName, WORLD_BEHAVIOR_PACKS_FILE_NAME), JSON.stringify(world.behaviorPacks.map(({version, uuid})=>({version, pack_id: uuid}))));
        if(world.resourcePacks) 
            await writeFile(join(folderName, WORLD_RESOURCE_PACKS_FILE_NAME), JSON.stringify(world.resourcePacks.map(({version, uuid})=>({version, pack_id: uuid}))));
        return ww;
    }
}