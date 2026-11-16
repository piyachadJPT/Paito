"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyIllustration } from "@/components/ui/EmptyIllustration";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useActiveTrip, useTripDays, useTripStops } from "@/hooks/useLocalData";
import { useNow } from "@/hooks/useNow";
import { insertStop } from "@/lib/schedule/plan-edit";
import { analyzeDay } from "@/lib/schedule/recalculate";
import { getServiceDate } from "@/lib/schedule/service-day";
import { getDayStops } from "@/lib/schedule/util";
import { newStopRow, savePlanChange } from "@/services/data/plan-repo";
import { useRepoDeps } from "@/services/data/SyncProvider";
import type { DayRow, TripRow } from "@/services/data/types";
import { DayTabs } from "./DayTabs";
import { DayTicket } from "./DayTicket";
import { StopEditorSheet } from "./StopEditorSheet";
import { Timeline } from "./Timeline";

/** Which day is "today" on the trip (null outside the trip). */
function todayDayNumber(trip: TripRow, days: DayRow[], now: Date | null): number | null {
  if (!now) return null;
  const date = getServiceDate(now.getTime(), trip.timezone, trip.day_cutoff_hour);
  return days.find((d) => d.date === date)?.day_number ?? null;
}

/** Opens on today; before the trip → Day 1, after it → the last day. */
function defaultDayNumber(trip: TripRow, days: DayRow[], now: Date | null): number {
  const first = days[0]?.day_number ?? 1;
  if (!now || days.length === 0) return first;
  const date = getServiceDate(now.getTime(), trip.timezone, trip.day_cutoff_hour);
  const match = days.find((d) => d.date === date);
  if (match) return match.day_number;
  return date > days[days.length - 1].date ? days[days.length - 1].day_number : first;
}

export function PlanScreen() {
  const trip = useActiveTrip();
  const days = useTripDays(trip?.id);
  const stops = useTripStops(trip?.id);
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [openStopId, setOpenStopId] = useState<string | null>(null);
  const repo = useRepoDeps();
  const toast = useToast();

  const loading = trip === undefined || (trip !== null && (days === undefined || stops === undefined));
  const today = trip && days ? todayDayNumber(trip, days, now) : null;
  const requested = Number(params.get("day"));
  const selectedNumber =
    days?.some((d) => d.day_number === requested) ? requested : trip && days ? defaultDayNumber(trip, days, now) : 1;
  const day = days?.find((d) => d.day_number === selectedNumber) ?? null;
  const dayStops = useMemo(() => (day && stops ? getDayStops(stops, day.id) : []), [day, stops]);
  const analysis = useMemo(() => analyzeDay(dayStops), [dayStops]);

  function selectDay(n: number) {
    router.replace(`${pathname}?day=${n}`, { scroll: false });
  }

  async function addStop() {
    if (!repo || !trip || !day) return;
    const row = newStopRow(repo, { tripId: trip.id, dayId: day.id });
    const undo = await savePlanChange(repo, insertStop(dayStops, row));
    toast.showUndo("เพิ่มสถานที่แล้ว", undo);
    setOpenStopId(row.id);
  }

  if (loading) return <PlanSkeleton />;

  if (!trip || !days || days.length === 0) {
    return (
      <div>
        <PageHeader title="แผนเที่ยว" />
        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-card px-5 py-6 text-center">
          <EmptyIllustration className="mx-auto w-48" />
          <h2 className="mt-4 text-[20px] font-bold">ยังไม่มีแผนเที่ยว</h2>
          <p className="mt-1 text-[15px] text-ink-2">สร้างทริปหรือนำเข้าไฟล์ในหน้าตั้งค่าก่อนนะ</p>
          <Link href="/settings" className="mt-4 inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-primary active:bg-primary-soft">
            ไปที่ตั้งค่า
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="แผนเที่ยว" subtitle={trip.name} />
      <div className="mt-4">
        <DayTabs days={days} selected={selectedNumber} today={today} onSelect={selectDay} />
      </div>

      {day && (
        <>
          <DayTicket day={day} stops={dayStops} timeZone={trip.timezone} />
          <Timeline stops={dayStops} analysis={analysis} timeZone={trip.timezone} onOpen={(s) => setOpenStopId(s.id)} />
          <div className="mt-3 pl-[80px]">
            <Button variant="secondary" size="md" className="w-full" icon={<Plus aria-hidden size={18} />} disabled={!repo} onClick={() => void addStop()}>
              เพิ่มสถานที่
            </Button>
          </div>
          <StopEditorSheet trip={trip} day={day} days={days} tripStops={stops ?? []} stopId={openStopId} onClose={() => setOpenStopId(null)} />
        </>
      )}
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-3 h-8 w-32 rounded-full bg-card-sunken" />
      <div className="mt-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-20 rounded-2xl bg-card-sunken" />
        ))}
      </div>
      <div className="mt-3 h-36 rounded-[20px] bg-card-sunken" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-3 ml-[80px] h-16 rounded-[var(--radius-card)] bg-card-sunken" />
      ))}
    </div>
  );
}
