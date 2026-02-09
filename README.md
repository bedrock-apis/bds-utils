# BDS Utils

## Server Properties

The `ServerPropertiesManager` handles the `server.properties` file. It parses the file into memory and allows programmatic updates.

```typescript
// Set server properties
installation.properties.set('online-mode', false);
installation.properties.set('content-log-console-output-enabled', true);
installation.properties.set('isHardcore', true);
installation.properties.set('enable-script', true);

// Get a property value
const levelName = installation.properties.get('level-name');

// Delete a property
installation.properties.delete('level-name');
```

## Config Permissions

The `ConfigPermissionsManager` manages `permissions.json` located in the `config` directory. This is primarily used to allow or deny script modules and configure their settings.

```typescript
// Allow specific script modules
installation.config.allowModule('@minecraft/server-net');

// Set module-specific configuration
installation.config.setConfiguration('@minecraft/server-net', {
   allowed_uris: ['https://example.com'],
   force_https: true,
   max_body_bytes: 1048576,
   max_concurrent_requests: 10,
   session_headers: {},
});
```

## Data Management

The `DataManager` handles behavior packs and resource packs. It supports importing addons from various sources including URLs, file paths, and streams.

```typescript
// Import an addon from a local file URL
await installation.data.import(new URL('./sky-gen-addon.mcpack', import.meta.url));
```

## World Management

The `WorldsManager` provides tools to manage server worlds located in the `worlds` directory. It can track existing worlds, create new ones, and remove them.

```typescript
// Get world information by level name
const worldInfo = await installation.worlds.getByLevelName('MyWorld');

if (worldInfo) {
   // Set this world as the active level in server.properties
   installation.worlds.setWorldActiveInProperties(worldInfo);

   // Delete the world and all its files
   await installation.worlds.delete(worldInfo);
}

// Create a new world and run it in BDS
const newWorld = await installation.worlds.create('NewAdventure');
installation.worlds.setWorldActiveInProperties(newWorld);
const process = await installation.run([]);
```
