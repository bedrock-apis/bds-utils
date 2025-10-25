import type { RolldownOptions } from "rolldown";
import { writeFileSync } from "node:fs";
import RAW_MANIFEST from "./package.json" with { type: "json" };
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { dts } from "rolldown-plugin-dts";
const MANIFEST = Object.assign({}, RAW_MANIFEST);

const EXPORTS: Record<string, any> = ((MANIFEST as any)["exports"] = {});
const input: Record<string, string> = {};
for (const dir of await readdir("./submodules", { withFileTypes: true })) {
   if (!dir.isDirectory()) continue;
   EXPORTS["./" + dir.name] = {
      default: "./dist/" + dir.name + ".js",
      types: "./dist/" + dir.name + ".d.ts",
   };
   input[dir.name] = "./submodules/" + dir.name + "/index.ts";
}
writeFileSync(
   resolve(import.meta.dirname, "./package.json"),
   JSON.stringify(MANIFEST, null, 2),
);
export default {
   input,
   plugins: [dts({ oxc: true })],
   external: /^(node:|unzip-web-stream)/,
   output: {
      cleanDir: true,
      dir: "./dist/",
   },
} as RolldownOptions;
