import { createClient } from "@supabase/supabase-js";
import webpush, { WebPushError } from "web-push";
import type { Database } from "@/services/supabase/types";
import { isAuthorized } from "@/services/keepalive/keepalive";
import { runPushTick, type PushDevice } from "@/services/push/tick";

/**
 * Called every minute by Supabase pg_cron (migration web_push → push_tick()).
 * Server only: reads every followed trip with the secret key and sends Web Push.
 */
export async function POST(request: Request) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ ok: false, error: "CRON_SECRET is not set" }, 500);
  if (!isAuthorized(request.headers.get("authorization"), secret)) return json({ ok: false, error: "unauthorized" }, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) {
    return json({ ok: false, error: "push env is not set" }, 500);
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const result = await runPushTick({
      now: () => Date.now(),
      listDevices: async () => {
        const { data, error } = await db
          .from("push_devices")
          .select("id, endpoint, p256dh, auth, trip_id, leave_on_plan")
          .not("trip_id", "is", null);
        if (error) throw new Error(error.message);
        return data as PushDevice[];
      },
      loadTrip: async (tripId) => {
        const [trip, days, stops] = await Promise.all([
          db.from("trips").select("*").eq("id", tripId).maybeSingle(),
          db.from("trip_days").select("*").eq("trip_id", tripId),
          db.from("trip_stops").select("*").eq("trip_id", tripId),
        ]);
        const error = trip.error ?? days.error ?? stops.error;
        if (error) throw new Error(error.message);
        if (!trip.data) return null;
        return { trip: trip.data, days: days.data ?? [], stops: stops.data ?? [] };
      },
      claim: async (tripId, alertKey) => {
        const { data, error } = await db
          .from("push_sent")
          .upsert({ trip_id: tripId, alert_key: alertKey }, { onConflict: "trip_id,alert_key", ignoreDuplicates: true })
          .select("alert_key");
        if (error) throw new Error(error.message);
        return (data ?? []).length > 0;
      },
      send: async (device, payload) => {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify(payload),
            { TTL: 600, urgency: "high" },
          );
          return "ok";
        } catch (e) {
          if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) return "gone";
          console.error("push send failed", e instanceof WebPushError ? e.statusCode : e);
          return "error";
        }
      },
      removeDevice: async (id) => {
        await db.from("push_devices").delete().eq("id", id);
      },
    });
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "tick failed" }, 502);
  }
}
