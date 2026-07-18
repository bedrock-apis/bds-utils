# bds-utils

[![npm version](https://badge.fury.io/js/@bedrock-apis%2Fbds-utils.svg)](https://www.npmjs.com/package/@bedrock-apis/bds-utils)

Set of packages for helping extracting BDS with many options

- Shared moduling with great treeshaking support and as lightweight as possible
- Using only nodeJS build-ins

### Supports
- Latest version resolution
- Installing BDS from link or zip file directly
- Installing resource/behavior packs
- Creating world with given resource/behavior packs
- Well typed server.properties APIs
- Running commands from console via process.runCommand

NPM: https://www.npmjs.com/package/@bedrock-apis/bds-utils

## Usage
```ts
import { Installation, getLatestDownloadLink } from '@bedrock-apis/bds-utils';
import { platform } from 'node:process';

const link = await getLatestDownloadLink({ platform: platform, preview: true });
if (!link) throw new ReferenceError('Failed to obtain download link for latest BDS');

await using installation = await Installation.From({ directory: 'my-installation' });
if (!installation.getExecutableFile()) {
   const link = await getLatestDownloadLink({ platform: platform, preview: true });
   if (!link) throw new ReferenceError('Failed to obtain download link for latest BDS');
   await installation.install(link);
}

// Start process with no arguments
const process = await installation.run([]);

// enable stdoutput redirection
process.enabledOutputRedirection();

// gracefully stop the server -> send "stop" command
await process.stop();
```
