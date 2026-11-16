/**
 * What the auth gate needs to know about on-device data.
 * Step 5 registers the IndexedDB (Dexie) implementation; until then there is
 * never local data, so a missing session always goes to /login.
 */
export interface LocalDataStore {
  /** True if trips are stored on this device (enables read-only mode without a session). */
  hasData(): Promise<boolean>;
  /** Wipe everything on this device. Called only from "ออกจากระบบ". */
  clear(): Promise<void>;
}

const emptyStore: LocalDataStore = {
  hasData: async () => false,
  clear: async () => {},
};

let current: LocalDataStore = emptyStore;

export function registerLocalDataStore(store: LocalDataStore): void {
  current = store;
}

export function getLocalDataStore(): LocalDataStore {
  return current;
}
