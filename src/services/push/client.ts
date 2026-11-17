import { getSupabase } from "@/services/supabase/client";

/**
 * Web Push on the device (iOS 16.4+, only when opened from the home screen).
 * The server (api/push/tick) decides when to send; this file only
 * subscribes the device and tells the server which trip it follows.
 */

export type PushSupport = "ok" | "needs_install" | "unsupported";

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (supported) return "ok";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && !standalone ? "needs_install" : "unsupported";
}

export function getPermission(): NotificationPermission | null {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : null;
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

export async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export interface DeviceInfo {
  tripId: string | null;
  leaveOnPlan: readonly string[];
}

async function saveDevice(sub: PushSubscription, info: DeviceInfo): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("subscription has no keys");
  const { error } = await getSupabase()
    .from("push_devices")
    .upsert(
      {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        trip_id: info.tripId,
        leave_on_plan: [...info.leaveOnPlan].slice(-50),
      },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(error.message);
}

/** Must run inside a tap (iOS asks for permission only from a user gesture). */
export async function enablePush(info: DeviceInfo): Promise<"ok" | "denied" | "unavailable"> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "unavailable";
  // Ask first, before any other await, so iOS still sees the tap
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const reg = await registration();
  if (!reg) return "unavailable";
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(key) }));
  await saveDevice(sub, info);
  return "ok";
}

export async function disablePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await getSupabase().from("push_devices").delete().eq("endpoint", endpoint);
}

/** Keep the server's copy of this device current (trip switched, "ออกตามแผน"). */
export async function syncDevice(info: DeviceInfo): Promise<void> {
  const sub = await getSubscription();
  if (sub) await saveDevice(sub, info);
}
