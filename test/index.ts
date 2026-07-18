import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DisposableMode, Installation } from '@bedrock-apis/bds-utils/install';
import { getLatestDownloadLink } from '@bedrock-apis/bds-utils/links';

await using installation = new Installation({
   directory: resolve(dirname(fileURLToPath(import.meta.url)), './the-installation'),
   disposableMode: DisposableMode.StopRunningServes,
});

// Check for installation availability
if (!installation.getExecutableFile()) {
   const downloadURL = await getLatestDownloadLink({ preview: true, platform: 'win32' /*platform() works*/ });
   // Check for success, might be null
   if (!downloadURL) throw new ReferenceError('Installation url not available');

   console.log('Installing');
   // Install
   await installation.install(downloadURL);
} else await installation.load();

// Set server.properties
installation.properties.set('online-mode', false);
installation.properties.set('content-log-console-output-enabled', true);
installation.properties.set('isHardcore', true);
installation.properties.set('enable-script', true);
console.log(installation.properties.delete('level-name'));

// Allow modules
installation.config.allowModule('@minecraft/server-net');

await installation.data.import(new URL('./sky-gen-addon.mcpack', import.meta.url));

const process = await installation.run([]);

// Enables output to console rendering
process.enabledOutputRedirection();

// Run commands
process.runCommand('list');

installation.events.add('dispose', async () => {
   await installation.load();
   const worldInfo = await installation.worlds.getByLevelName(
      installation.properties.get('level-name') ?? 'level'
   );

   // Auto clean up
   if (worldInfo) await installation.worlds.delete(worldInfo);
});

installation.properties.set('level-name', 'Name');
installation.properties.set('allow-cheats', true);

installation.config.allowModule('@minecraft/server-net');
