"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Registers /sw.js in production only (SPEC §12) and offers
 * "มีเวอร์ชันใหม่ · โหลดใหม่" when a new build is waiting.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const userAskedReload = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    let cleanup = () => {};

    // Reload only when the user asked for the new version (not on the very first install)
    const onControllerChange = () => {
      if (userAskedReload.current) window.location.reload();
    };
    sw.addEventListener("controllerchange", onControllerChange);

    sw.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const track = (worker: ServiceWorker) =>
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && sw.controller) setWaiting(worker);
          });
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);
        if (reg.installing) track(reg.installing);
        reg.addEventListener("updatefound", () => reg.installing && track(reg.installing));

        // iOS keeps the app alive for days: look for a new build when it comes back
        const onVisible = () => {
          if (document.visibilityState === "visible") reg.update().catch(() => undefined);
        };
        document.addEventListener("visibilitychange", onVisible);
        cleanup = () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch(() => undefined); // no SW (private mode, old iOS): the app still works online

    return () => {
      sw.removeEventListener("controllerchange", onControllerChange);
      cleanup();
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-[60] px-4">
      <div
        role="status"
        className="pointer-events-auto mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-2xl bg-ink py-1.5 pr-1.5 pl-4 text-[15px] text-canvas shadow-[var(--shadow-float)]"
      >
        <RefreshCw aria-hidden size={18} className="shrink-0" />
        <span className="flex-1">มีเวอร์ชันใหม่</span>
        <button
          type="button"
          onClick={() => {
            userAskedReload.current = true;
            waiting.postMessage("SKIP_WAITING");
          }}
          className="min-h-11 shrink-0 rounded-xl px-3 font-semibold active:bg-canvas/15"
        >
          โหลดใหม่
        </button>
      </div>
    </div>
  );
}
