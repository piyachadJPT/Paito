import { ClockBanner } from "@/components/clock/ClockBanner";
import { TabBar } from "@/components/ui/TabBar";

/** App shell for the three tabs. Client-side only data; no server auth here. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Keeps content clear of the status bar and holds the simulated-clock strip */}
      <div className="sticky top-0 z-30 bg-canvas pt-[env(safe-area-inset-top)]">
        <ClockBanner />
      </div>
      <main className="mx-auto w-full max-w-md px-4 pt-3 pb-[calc(96px+env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
        {children}
      </main>
      <TabBar />
    </>
  );
}
