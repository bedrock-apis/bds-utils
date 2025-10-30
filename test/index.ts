import { resolve } from "node:path";
import { platform } from "node:os";
import { CachedInstaller } from "@bedrock-apis/bds-setups/cached";
import { Installation } from "../dist/install";
import { getLatestDownloadLink, getLatestDownloadLinkFromOSSGit } from "../dist/links";
/*
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
*/

const downloadURL = await getLatestDownloadLink({is_preview: true, platform: "win32" /*platform() works*/ });
// Check for success, might be null
if(!downloadURL)
  throw new ReferenceError("Installation url not available");


const installation = new Installation("./here/");
await installation.installFromURL(downloadURL);

// Set server.properties
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


// Run the installation
const process = await installation.run([]);

// Enables output to console rendering
process.enabledOutputRedirection();

// Run commands
process.runCommand("list");

// Stops the server in 5s
setTimeout(()=>process.stop(true), 5_000);

//Waits for process to exit, returns exit code
const _ = await process.getAwaiter();


/*await installation.runWithTestConfig(
  {generate_api_metadata: true}, []
);*/

console.log("Started");
