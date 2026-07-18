import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SERVER_PROPERTIES_FILE_NAME } from '../constants';
import { BaseInstallationManager } from './base';

export class ServerPropertiesManager extends BaseInstallationManager {
   protected readonly properties: Map<string, number | string | boolean> = new Map();

   /**
    * Loads server properties from the server.properties file.
    * Parses key-value pairs and stores them in memory.
    */
   public override async load(): Promise<void> {
      const file = join(this.installation.directory, SERVER_PROPERTIES_FILE_NAME);
      const text = await readFile(file)
         .then(_ => _.toString('utf8'))
         .catch(_ => null);
      if (!text) return;

      for (let line of text.split(/\n|\r\n|\r/)) {
         line = line.trim();
         if (!line.length) continue;
         if (line.startsWith('#')) continue;

         const hasKeySeparatorIndex = line.indexOf('=');
         if (hasKeySeparatorIndex === -1) continue;

         const name = line.substring(0, hasKeySeparatorIndex);
         let data: string | number | boolean = line.substring(hasKeySeparatorIndex + 1);

         if (data === 'true' || data === 'false') data = data === 'true';
         else if (isFinite(Number(data))) data = Number(data);

         this.properties.set(name, data);
      }
   }

   /**
    * Saves current properties back to the server.properties file.
    */
   public override async save(): Promise<void> {
      const file = join(this.installation.directory, SERVER_PROPERTIES_FILE_NAME);
      await writeFile(
         file,
         Array.from(this.properties.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')
      ).catch(_ => null);
   }

   /**
    * Gets the value of a specific property.
    * @param name The property key name.
    * @returns The property value or null if not found.
    */
   public get<K extends keyof PropertiesMapOptional>(name: K): PropertiesMapOptional[K] | null {
      return (this.properties.get(name) ?? null) as PropertiesMapOptional[K] | null;
   }

   /**
    * Sets or updates a property value.
    * @param name The property key name.
    * @param value The value to set (string, number, or boolean).
    */
   public set<K extends keyof PropertiesMapOptional>(name: K, value: PropertiesMapOptional[K]): void;
   public set<K extends keyof PropertiesMapOptional>(name: K, value: string | boolean | number): void {
      return void this.properties.set(name, value);
   }

   /**
    * Checks if a property exists.
    * @param name The property key name.
    */
   public has<K extends keyof PropertiesMapOptional>(name: K): boolean {
      return this.properties.has(name);
   }

   /**
    * Deletes a property.
    * @param name The property key name.
    * @returns True if the property was deleted, false if it didn't exist.
    */
   public delete<K extends keyof PropertiesMapOptional>(name: K): boolean {
      return this.properties.delete(name);
   }
}

export type PropertiesMapOptional = PropertiesMap & { [k in `${string}` & {}]: string | boolean | number };
// Credits to "xkingdark" for providing lists of these properties and hopefully AI mapped them all.
export type PropertiesMap = {
   'adventure-mode-overrides-enabled': boolean;
   'allow-cheats': boolean;
   'allow-inbound-script-debugging': boolean;
   'allow-list': boolean;
   'white-list': boolean;
   'allow-outbound-script-debugging': boolean;
   'allow-subclient-login': boolean;
   'allow-unconnected-pings': boolean;
   'application-id': string;
   'application-secret': string;
   'application-tenant-id': string;
   'block-network-ids-are-hashes': boolean;
   'chat-restriction': ('None' | 'Dropped' | 'Disabled') | (string & {});
   'client-side-chunk-generation-enabled': boolean;
   'client-throttle-scalar': number;
   'client-throttle-threshold': number;
   'compression-algorithm': ('zlib' | 'snappy') | (string & {});
   'compression-threshold': number;
   'content-log-console-output-enabled': boolean;
   'content-log-file-enabled': boolean;
   'content-log-level': ('verbose' | 'info' | 'warning' | 'error') | (string & {});
   'correct-player-movement': boolean;
   'default-player-permission-level': ('visitor' | 'member' | 'operator') | (string & {});
   difficulty: ('peaceful' | 'easy' | 'normal' | 'hard' | '0' | '1' | '2' | '3') | (string & {});
   'diagnostics-capture-auto-start': boolean;
   'diagnostics-capture-max-file-size': number;
   'diagnostics-capture-max-files': number;
   'disable-client-vibrant-visuals': boolean;
   'disable-custom-skins': boolean;
   'disable-emote-chat': boolean;
   'disable-persona': boolean;
   'disable-player-interaction': boolean;
   'emit-server-telemetry': boolean;
   'enable-editor-network-metrics': boolean;
   'enable-item-stack-net-manager-deprecated': boolean;
   'enable-lan-visibility': boolean;
   'enable-packet-receipt-eventing': boolean;
   'enable-packet-rate-limiter': boolean;
   'enable-player-changed-skin-text': boolean;
   'enable-player-connection-text': boolean;
   'enable-player-sleeping-text': boolean;
   'enable-profiler': boolean;
   'enable-script': boolean;
   'force-gamemode': boolean;
   'force-inbound-debug-port': number;
   gamemode: ('survival' | 'creative' | 'adventure' | 'spectator' | '0' | '1' | '2') | (string & {});
   'http-log-level': ('off' | 'error' | 'warning' | 'important' | 'info' | 'verbose') | (string & {});
   isHardcore: boolean;
   'item-transaction-logging-enabled': boolean;
   language: string;
   'level-name': string;
   'level-seed': string | number;
   'level-type': ('default' | 'flat' | 'legacy') | (string & {});
   'max-players': number;
   'max-threads': number;
   'minecraft-services-timeout': number;
   'msa-gamertags-only': boolean;
   'nethernet-id': string;
   'nethernet-log-level':
      | ('verbose' | 'information' | 'warning' | 'error' | 'criticalOnly' | 'disabled')
      | (string & {});
   'nethernet-disable-trickle-ice': boolean;
   'online-mode': boolean;
   'op-permission-level': number;
   'player-idle-timeout': number;
   'player-movement-action-direction-threshold': number;
   'player-position-acceptance-threshold': number;
   'player-rewind-history-size-ticks': number;
   'player-rewind-min-correction-delay-ticks': number;
   'player-tick-policy': ('greedy' | 'throttled') | (string & {});
   'player-tick-throttled-input-batch-size': number;
   'player-tick-throttled-max-tick-credits': number;
   'raknet-joinflood-protection': boolean;
   'realms-stories-enabled': boolean;
   'remote-server-communication-endpoint': string;
   'script-debugger-auto-attach': ('connect' | 'listen' | 'disabled') | (string & {});
   'script-debugger-auto-attach-timeout': number;
   'script-debugger-auto-attach-connect-address': string;
   'script-debugger-passcode': string;
   'script-watchdog-enable': boolean;
   'script-watchdog-enable-exception-handling': boolean;
   'script-watchdog-enable-shutdown': boolean;
   'script-watchdog-hang-exception': boolean;
   'script-watchdog-hang-threshold': number;
   'script-watchdog-memory-limit': number;
   'script-watchdog-memory-warning': number;
   'script-watchdog-slow-threshold': number;
   'script-watchdog-spike-threshold': number;
   'sentry-rate-limit-window': number;
   'sentry-max-events-per-window': number;
   'server-authoritative-block-breaking': boolean;
   'server-authoritative-block-breaking-pick-range-scalar': number;
   'server-authoritative-dismount-strict': boolean;
   'server-authoritative-entity-interactions-strict': boolean;
   'server-authoritative-movement':
      | boolean
      | (
           | 'server-auth'
           | 'client-auth'
           | 'server-auth-with-rewind'
           | 'server-auth-with-rewind-vanilla-flight'
           | 'server-auth-with-rewind-all-flight'
           | 'server-auth-flight'
           | 'server-auth-retail-flight'
           | 'client-auth-flight'
        )
      | (string & {});
   'server-authoritative-movement-strict': boolean;
   'server-build-radius-ratio': 'Disabled' | number | (string & {});
   'server-id': string;
   'server-name': string;
   'server-port': number;
   'server-portv6': number;
   'server-port-mappings': string;
   'server-public-ip': string;
   'server-type': string;
   'server-wakeup-frequency': number;
   'service-discovery': string;
   'service-overrides': string;
   'texturepack-required': boolean;
   'tick-distance': number;
   'transport-layer-type': ('raknet' | 'nethernet-websocket') | (string & {});
   'trusted-key': string;
   'use-json-rpc': boolean;
};
