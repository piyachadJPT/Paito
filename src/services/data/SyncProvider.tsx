"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { clock } from "@/lib/clock";
import { useAuth } from "@/services/auth/AuthProvider";
import { db } from "./db";
import { newId } from "./id";
import { onLocalChange } from "./local";
import { createSupabaseRemote } from "./remote";
import type { RepoDeps } from "./repo";
import { SyncEngine, type SyncState } from "./sync";

interface SyncContextValue {
  engine: SyncEngine | null;
}

const SyncContext = createContext<SyncContextValue>({ engine: null });

let singleton: SyncEngine | null = null;
let onPulledHook: (() => void) | null = null;

function getEngine(): SyncEngine {
  if (!singleton) {
    singleton = new SyncEngine(db, createSupabaseRemote(), {
      now: () => Date.now(), // real time: backoff and throttling are about the network, not the trip clock
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (h) => window.clearTimeout(h as number),
      onPulled: () => onPulledHook?.(),
    });
  }
  return singleton;
}

const LOCAL_FLUSH_DELAY_MS = 300;

/**
 * Runs sync while signed in (SPEC §7): on open, `online`, returning to the
 * app (pull throttled to 30 s) and shortly after each local write.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { status, refreshLocalData } = useAuth();
  const signedIn = status === "signed_in";
  const engine = signedIn ? getEngine() : null;

  useEffect(() => {
    if (!engine) return;
    onPulledHook = () => void refreshLocalData();

    void engine.sync({ force: true });

    const onOnline = () => void engine.sync({ force: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") void engine.sync();
    };
    let flushTimer: number | undefined;
    const offLocal = onLocalChange(() => {
      void refreshLocalData();
      window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(() => void engine.sync({ pull: false }), LOCAL_FLUSH_DELAY_MS);
    });

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(flushTimer);
      offLocal();
      onPulledHook = null;
    };
  }, [engine, refreshLocalData]);

  const value = useMemo(() => ({ engine }), [engine]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

const IDLE: SyncState = { phase: "idle", lastError: null, nextRetryAt: null };
const noop = () => () => {};

export function useSyncEngine(): SyncEngine | null {
  return useContext(SyncContext).engine;
}

export function useSyncState(): SyncState {
  const engine = useSyncEngine();
  return useSyncExternalStore(engine?.subscribe ?? noop, engine?.getState ?? (() => IDLE), () => IDLE);
}

/** navigator.onLine, true on the server. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** Dependencies for repo writes, or null when editing is not allowed (read-only / signed out). */
export function useRepoDeps(): RepoDeps | null {
  const { user, readOnly, status } = useAuth();
  return useMemo(() => {
    if (!user || readOnly || status !== "signed_in") return null;
    return { db, userId: user.id, newId, nowIso: () => clock.now().toISOString() };
  }, [user, readOnly, status]);
}
