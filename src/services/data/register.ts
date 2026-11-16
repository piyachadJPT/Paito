import { registerLocalDataStore } from "@/services/auth/local-data";
import { db } from "./db";
import { clearLocal } from "./local";

/** Connects the auth gate (step 3) to IndexedDB. Imported for its side effect. */
registerLocalDataStore({
  hasData: async () => (await db.trips.count()) > 0,
  clear: () => clearLocal(db),
});
