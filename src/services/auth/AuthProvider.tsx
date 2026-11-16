"use client";

import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSupabase } from "@/services/supabase/client";
import { clearKnownUser, readKnownUser, writeKnownUser, type KnownUser } from "./known-user";
import { getLocalDataStore } from "./local-data";
import { statusFromAuthEvent, statusFromInitialSession, type AuthStatus } from "./session-state";

export interface AuthContextValue {
  status: AuthStatus;
  user: KnownUser | null;
  /** null while unknown */
  hasLocalData: boolean | null;
  /** No usable session, but local data can still be viewed */
  readOnly: boolean;
  /** Sign out on this device and wipe local data. Works offline. */
  signOut(): Promise<void>;
  /** Re-check local data (call after importing/creating a trip). */
  refreshLocalData(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromSession(session: Session): KnownUser {
  return { id: session.user.id, email: session.user.email ?? null };
}

/**
 * Client-only auth state. No middleware, no server redirects: the app must
 * open offline from the service worker (SPEC §8, §13).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<KnownUser | null>(null);
  const [hasLocalData, setHasLocalData] = useState<boolean | null>(null);
  const explicitSignOut = useRef(false);

  const refreshLocalData = useCallback(async () => {
    setHasLocalData(await getLocalDataStore().hasData().catch(() => false));
  }, []);

  useEffect(() => {
    const auth = getSupabase().auth;
    let cancelled = false;

    getLocalDataStore()
      .hasData()
      .catch(() => false)
      .then((has) => {
        if (!cancelled) setHasLocalData(has);
      });

    auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      const session = data.session;
      if (session) {
        const u = userFromSession(session);
        writeKnownUser(u);
        setUser(u);
      } else {
        // Offline / expired: still show who was signed in
        setUser(readKnownUser());
      }
      setStatus(
        statusFromInitialSession({
          hasSession: Boolean(session),
          networkError: isAuthRetryableFetchError(error),
          knownUser: Boolean(readKnownUser()),
        }),
      );
    });

    // Keep this callback synchronous: supabase-js warns against awaiting auth calls here.
    const { data: subscription } = auth.onAuthStateChange((event, session) => {
      const next = statusFromAuthEvent({
        event,
        hasSession: Boolean(session),
        explicitSignOut: explicitSignOut.current,
        knownUser: Boolean(readKnownUser()),
      });
      if (session) {
        const u = userFromSession(session);
        writeKnownUser(u);
        setUser(u);
        explicitSignOut.current = false;
      }
      if (next) setStatus(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    explicitSignOut.current = true;
    // scope "local": clears this device even when offline
    await getSupabase().auth.signOut({ scope: "local" }).catch(() => undefined);
    await getLocalDataStore().clear();
    clearKnownUser();
    setUser(null);
    setHasLocalData(false);
    setStatus("signed_out");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      hasLocalData,
      readOnly: status !== "signed_in" && status !== "loading" && hasLocalData === true,
      signOut,
      refreshLocalData,
    }),
    [status, user, hasLocalData, signOut, refreshLocalData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
