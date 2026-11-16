import { timingSafeEqual } from "node:crypto";

export interface KeepaliveResult {
  status: 200 | 401 | 500 | 502;
  body: { ok: boolean; at?: string; error?: string };
}

/** Constant-time check of `Authorization: Bearer <secret>`. */
export function isAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Vercel Cron → Supabase ping so the free project is not paused (SPEC §15).
 * `ping` calls rpc('keepalive') and returns the database time.
 */
export async function runKeepalive(args: {
  authorization: string | null;
  secret: string | undefined;
  ping(): Promise<{ data: string | null; error: { message: string } | null }>;
}): Promise<KeepaliveResult> {
  if (!args.secret) return { status: 500, body: { ok: false, error: "CRON_SECRET is not set" } };
  if (!isAuthorized(args.authorization, args.secret)) return { status: 401, body: { ok: false, error: "unauthorized" } };
  try {
    const { data, error } = await args.ping();
    if (error) return { status: 502, body: { ok: false, error: error.message } };
    return { status: 200, body: { ok: true, at: data ?? undefined } };
  } catch (e) {
    return { status: 502, body: { ok: false, error: e instanceof Error ? e.message : "ping failed" } };
  }
}
