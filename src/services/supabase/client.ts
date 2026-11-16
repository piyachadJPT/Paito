import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Browser Supabase client. Uses the publishable (or legacy anon) key only —
 * never a service/secret key (CLAUDE.md › ความปลอดภัย).
 *
 * Env vars must be referenced literally so Next.js inlines them at build time.
 */
function readConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)",
    );
  }
  return { url, key };
}

let client: TypedSupabaseClient | null = null;

/** Lazily created singleton, so importing this module never throws during build. */
export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    const { url, key } = readConfig();
    client = createClient<Database>(url, key, {
      auth: {
        // Log in once and stay logged in (SPEC §8)
        persistSession: true,
        autoRefreshToken: true,
        // Email OTP only; no magic-link redirects to parse
        detectSessionInUrl: false,
        storageKey: "paito.auth",
      },
    });
  }
  return client;
}
