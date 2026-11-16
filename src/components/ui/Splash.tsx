import { HandIcon } from "@/components/ui/icons";

/** Static full-screen placeholder while auth state loads (no animation). */
export function Splash() {
  return (
    <div role="status" aria-label="กำลังโหลด" className="grid min-h-dvh place-items-center">
      <span className="grid size-16 -rotate-3 place-items-center rounded-[14px] bg-primary text-on-primary shadow-[0_3px_0_var(--primary-pressed)]">
        <HandIcon name="arrive" size={34} />
      </span>
    </div>
  );
}
