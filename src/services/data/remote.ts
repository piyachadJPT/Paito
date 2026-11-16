import { getSupabase } from "@/services/supabase/client";
import type { DayRow, StopRow, SyncedTable, TripRow } from "./types";

/**
 * - network:  no connection → stop and retry with backoff
 * - auth:     JWT expired / missing → refresh the session, don't mark failed
 * - retry:    server busy (408, 429, 5xx) → backoff
 * - rejected: other 4xx → mark the op failed (shown in Settings)
 */
export type RemoteErrorKind = "network" | "auth" | "retry" | "rejected";

export type RemoteResult = { ok: true } | { ok: false; kind: RemoteErrorKind; message: string };

export type FetchAllResult =
  | { ok: true; trips: TripRow[]; trip_days: DayRow[]; trip_stops: StopRow[] }
  | { ok: false; kind: RemoteErrorKind; message: string };

export interface RemoteClient {
  upsert(table: SyncedTable, rows: Record<string, unknown>[]): Promise<RemoteResult>;
  delete(table: SyncedTable, ids: string[]): Promise<RemoteResult>;
  fetchAll(): Promise<FetchAllResult>;
  /** true if a fresh session is available now */
  refreshSession(): Promise<boolean>;
}

const JWT_CODES = new Set(["PGRST301", "PGRST302", "PGRST303"]);

export function classifyRemoteError(status: number, code?: string | null): RemoteErrorKind {
  if (status === 0) return "network";
  if (status === 401 || (code && JWT_CODES.has(code))) return "auth";
  if (status === 408 || status === 429 || status >= 500) return "retry";
  return "rejected";
}

interface PostgrestLike {
  error: { message: string; code?: string | null } | null;
  status: number;
}

function toResult(res: PostgrestLike): RemoteResult {
  if (!res.error) return { ok: true };
  return { ok: false, kind: classifyRemoteError(res.status, res.error.code), message: res.error.message };
}

function networkFailure(err: unknown): RemoteResult & { ok: false } {
  return { ok: false, kind: "network", message: err instanceof Error ? err.message : String(err) };
}

/** RemoteClient backed by supabase-js (publishable key + user session, RLS applies). */
export function createSupabaseRemote(): RemoteClient {
  const sb = () => getSupabase();
  return {
    async upsert(table, rows) {
      try {
        return toResult(await sb().from(table).upsert(rows as never, { onConflict: "id" }));
      } catch (err) {
        return networkFailure(err);
      }
    },
    async delete(table, ids) {
      try {
        return toResult(await sb().from(table).delete().in("id", ids));
      } catch (err) {
        return networkFailure(err);
      }
    },
    async fetchAll() {
      try {
        const [trips, days, stops] = await Promise.all([
          sb().from("trips").select("*"),
          sb().from("trip_days").select("*"),
          sb().from("trip_stops").select("*"),
        ]);
        for (const res of [trips, days, stops]) {
          const r = toResult(res);
          if (!r.ok) return r;
        }
        return { ok: true, trips: trips.data ?? [], trip_days: days.data ?? [], trip_stops: stops.data ?? [] };
      } catch (err) {
        return networkFailure(err);
      }
    },
    async refreshSession() {
      try {
        const { data, error } = await sb().auth.refreshSession();
        return !error && Boolean(data.session);
      } catch {
        return false;
      }
    },
  };
}
