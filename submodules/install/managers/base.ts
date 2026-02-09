import { Installation } from '../installation';

/**
 * Base class for all installation managers.
 * Provides access to the parent installation and defines lifecycle methods.
 */
export abstract class BaseInstallationManager {
   protected readonly installation: Installation;

   public constructor(installation: Installation) {
      this.installation = installation;
   }

   /**
    * Loads data from the installation directory into memory.
    */
   public abstract load(): Promise<void>;

   /**
    * Persists in-memory data back to the installation directory.
    */
   public abstract save(): Promise<void>;
}
