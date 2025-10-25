import { resolve } from "node:path";
import { Installation } from "@bedrock-apis/bds-setups/install";
import { getLatestDownloadLinkFromOSSGit } from "@bedrock-apis/bds-setups/links";
import { platform } from "node:os";

/*const download_url = await getLatestDownloadLinkFromServices({platform: platform() as "win32", is_preview: true});
if(!download_url)
    throw new ReferenceError("Failed to get latest BDS link");*/

const folder = resolve(import.meta.dirname, "./test-folder/");
const installation = new Installation(folder);
if (installation.getExecutableFile()) await installation.load();
else
  await installation.installFromURL(
    (await getLatestDownloadLinkFromOSSGit({
      platform: platform() as "win32",
      is_preview: true,
    }))!,
  );

console.log("Installed");

installation.properties.set("online-mode", false);
installation.properties.set("content-log-console-output-enabled", true);
installation.properties.set("isHardcore", true);
installation.properties.set("enable-script", true);
installation.configPermissions.addAllowedModules(
  "@minecraft/server",
  "@minecraft/server-ui",
  "@minecraft/server-net",
  "@minecraft/server-admin",
  "@minecraft/server-editor",
  "@minecraft/server-editor-bindings",
  "@minecraft/server-editor-private-bindings",
  "@minecraft/server-bindings",
  "@minecraft/server-debug",
);
await installation.run(["Editor=False"]);
console.log("Started");
