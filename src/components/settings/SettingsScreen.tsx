"use client";

import { EmptyIllustration } from "@/components/ui/EmptyIllustration";
import { PageHeader } from "@/components/ui/PageHeader";
import { useActiveTripId, useTrips } from "@/hooks/useLocalData";
import { AccountSection } from "./AccountSection";
import { DevSection } from "./DevSection";
import { SyncSettings } from "./SyncSettings";
import { TripActions, TripsManager } from "./TripsManager";
import { TripSettings } from "./TripSettings";

export function SettingsScreen() {
  const trips = useTrips();
  const activeId = useActiveTripId();
  const loading = trips === undefined || activeId === undefined;
  const active = trips?.find((t) => t.id === activeId) ?? null;

  return (
    <div>
      <PageHeader title="ตั้งค่า" />

      {loading ? (
        <SettingsSkeleton />
      ) : trips.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-card px-5 pt-6 pb-3 text-center">
          <EmptyIllustration className="mx-auto w-48" />
          <h2 className="mt-4 text-[20px] font-bold">ยังไม่มีทริป</h2>
          <p className="mt-1 text-[15px] text-ink-2">เริ่มจากสร้างทริปใหม่ หรือนำเข้าไฟล์แผนเที่ยวที่เตรียมไว้</p>
          <div className="-mx-2 mt-3 text-left">
            <TripActions active={null} />
          </div>
        </div>
      ) : (
        <>
          {active && <TripSettings trip={active} />}
          <TripsManager trips={trips} activeId={activeId} />
        </>
      )}

      <SyncSettings timeZone={active?.timezone} />
      <div className="mt-7">
        <AccountSection />
      </div>
      <DevSection timeZone={active?.timezone} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="mt-7 flex flex-col gap-3">
      <div className="h-4 w-24 rounded-full bg-card-sunken" />
      <div className="h-36 rounded-[var(--radius-card)] bg-card-sunken" />
      <div className="mt-4 h-4 w-28 rounded-full bg-card-sunken" />
      <div className="h-28 rounded-[var(--radius-card)] bg-card-sunken" />
    </div>
  );
}
