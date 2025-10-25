import { Installation } from "./installation";
import type { CachedInstallerOptions } from "./interfaces";

export class CachedInstaller {
   private constructor(){}
   public static async ensure(options: CachedInstallerOptions): Promise<Installation>{
      return null!;
   }
}