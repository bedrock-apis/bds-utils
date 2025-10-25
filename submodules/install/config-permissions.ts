import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class ConfigPermissions {
    public constructor(public readonly path: string) { }
    protected raw: Record<string, string | object | number | boolean> = {};
    public async load(): Promise<this> {
        try {
            const theText = (await readFile(this.path)).toString("utf8");
            const data = JSON.parse(theText);
            this.raw = data;
        } catch { }
        return this;
    }

    public getAllowedModules(): Iterable<string> {
        return Array.prototype.values.call((this.raw.allowed_modules ??= []));
    }

    public addAllowedModules(...moduleNames: string[]): void {
        this.raw.allowed_modules = new Set([
            ...moduleNames,
            ...((this.raw.allowed_modules as string[]) ?? []),
        ])
            .values()
            .toArray();
    }

    public removeAllowedModules(...modulesNames: string[]): void {
        const base = new Set<string>((this.raw.allowed_modules ?? []) as any);
        this.raw.allowed_modules = base
            .difference(new Set(modulesNames))
            .values()
            .toArray();
    }

    public async save(): Promise<this> {
        await mkdir(dirname(this.path)).catch((_) => null);
        await writeFile(this.path, JSON.stringify(this.raw, null, 3));
        return this;
    }
}
