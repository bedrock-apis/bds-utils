import { resolve } from "node:path";
import { platform } from "node:os";
import { CachedInstaller } from "@bedrock-apis/bds-setups/cached";

const installation = await CachedInstaller.ensure({
  installationCacheDir: resolve(import.meta.dirname, "./the-cache/"),
  installationDirectory: resolve(import.meta.dirname, "./the-installation/"),
  fallbackVersionOptions: {
    is_preview: true,
    platform: platform() as "win32",
  }
});
if(!installation)
  throw new ReferenceError("Failed to ensure installation, resources not available");
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

await installation.runWithTestConfig(
  {generate_api_metadata: true}, []
);
console.log("Started");
