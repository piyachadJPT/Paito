import { MapPin } from "lucide-react";

/** Static full-screen placeholder while auth state loads (no animation). */
export function Splash() {
  return (
    <div role="status" aria-label="กำลังโหลด" className="grid min-h-dvh place-items-center bg-canvas">
      <span className="grid size-16 place-items-center rounded-[22px] bg-primary text-on-primary">
        <MapPin aria-hidden size={32} strokeWidth={2.4} />
      </span>
    </div>
  );
}
