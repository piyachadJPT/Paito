"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Splash } from "@/components/ui/Splash";
import { useAuth } from "@/services/auth/AuthProvider";

/**
 * Client-side gate for the app tabs (never a server redirect — the shell must
 * open offline):
 * - signed in → app
 * - no session but data on this device → app in read-only mode (banner shown)
 * - no session and no local data → /login
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, hasLocalData } = useAuth();
  const router = useRouter();

  const signedOut = status === "signed_out" || status === "session_expired";
  const mustLogin = signedOut && hasLocalData === false;

  useEffect(() => {
    if (mustLogin) router.replace("/login");
  }, [mustLogin, router]);

  if (status === "signed_in") return children;
  if (status === "loading" || hasLocalData === null || mustLogin) return <Splash />;
  return children;
}
