import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class ServerProperties extends Map<string, number | string | boolean> {
    public constructor(public readonly path: string) {
        super();
    }

    public async load(clean: boolean = false): Promise<this> {
        try {
            if (clean) this.clear();
            const file = (await readFile(this.path)).toString("utf8");
            for (const line of file.split(/\n|\r\n|\r/).map((e) => e.trim())) {
                if (line.startsWith("#")) continue;
                if (line === "") continue;

                const indexOfEqual = line.indexOf("=");
                const name = line.substring(0, indexOfEqual);
                let data: string | number | boolean = line.substring(indexOfEqual + 1);

                if (data === "true" || data === "false") data = data === "true";
                else if (isFinite(Number(data))) data = Number(data);

                if (!this.has(name)) this.set(name, data);
            }
        } catch { }

        return this;
    }

    public async save(): Promise<this> {
        await mkdir(dirname(this.path)).catch((_) => null);
        await writeFile(
            this.path,
            this.entries()
                .map(([k, v]) => `${k}=${v}`)
                .toArray()
                .join("\n"),
        );

        return this;
    }
}