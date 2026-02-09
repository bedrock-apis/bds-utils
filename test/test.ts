import { DisposableMode, Installation } from '../dist/install';

await using installation = new Installation({
   directory: './test/bds',
   disposableMode: DisposableMode.StopRunningServes,
});

// Install if not available
await installation.ensureExecutable({ preview: true, platform: 'win32' });

//Set properties
installation.properties.set('allow-cheats', true);
installation.properties.set('isHardcore', true);
installation.properties.set('content-log-console-output-enabled', true);
installation.properties.set('enable-script', true);
installation.properties.set('online-mode', false);

//Allow additional modules
installation.config.allowModule('@minecraft/server-net');
if (!(await installation.worlds.getByLevelName('level'))) {
   // Import it
   //const [behavior_pack] = await installation.data.import(new URL('./sky-gen-addon.mcpack', import.meta.url));
   // Create custom world
   const world = await installation.worlds.create('level', {
      behavior_packs: [{ uuid: '1bf45a9d-f6f5-4a42-8a8e-b4fd0a8233bf', version: '1.0.0' }],
      resource_packs: [],
      experiments: ['gametest'],
   });
   installation.worlds.setWorldActiveInProperties(world);
}

installation.events.add('dispose', async () => {
   const w = await installation.worlds.getByLevelName('level');
   installation.worlds.delete(w!);
});

// Run BDS
const process = await installation.run([]);
process.enabledOutputRedirection();
process.runCommand('say Hello Everyone');

// Internally calls process.stop();
