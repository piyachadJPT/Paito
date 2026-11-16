import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/services/supabase/types";
import { runKeepalive } from "@/services/keepalive/keepalive";

/**
 * Daily Vercel Cron target (vercel.json). Uses the publishable key only —
 * keepalive() is granted to anon, so no secret Supabase key is needed.
 */
export async function GET(request: Request) {
  const result = await runKeepalive({
    authorization: request.headers.get("authorization"),
    secret: process.env.CRON_SECRET,
    ping: async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return { data: null, error: { message: "Supabase env is not set" } };
      const supabase = createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return supabase.rpc("keepalive");
    },
  });
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
