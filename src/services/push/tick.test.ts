import { describe, expect, it } from "vitest";
import { at, loadSeed } from "@/test/seed";
import { MINUTE } from "@/lib/schedule/types";
import { runPushTick, type PushDevice, type PushPayload, type SendResult, type TickDeps } from "./tick";

const seed = loadSeed();

const device = (over: Partial<PushDevice> = {}): PushDevice => ({
  id: "dev-1",
  endpoint: "https://push.example/1",
  p256dh: "p",
  auth: "a",
  trip_id: seed.trip.id,
  leave_on_plan: [],
  ...over,
});

function fakeDeps(now: number, opts: { devices?: PushDevice[]; sendResult?: SendResult } = {}) {
  const claimed = new Set<string>();
  const sent: { device: string; payload: PushPayload }[] = [];
  const removed: string[] = [];
  const state = { now };
  const deps: TickDeps = {
    now: () => state.now,
    listDevices: async () => opts.devices ?? [device()],
    loadTrip: async (id) => (id === seed.trip.id ? { trip: seed.trip, days: seed.days, stops: seed.stops } : null),
    claim: async (tripId, key) => {
      const k = `${tripId}|${key}`;
      if (claimed.has(k)) return false;
      claimed.add(k);
      return true;
    },
    send: async (d, payload) => {
      sent.push({ device: d.id, payload });
      return opts.sendResult ?? "ok";
    },
    removeDevice: async (id) => {
      removed.push(id);
    },
  };
  return { deps, sent, removed, claimed, state };
}

describe("runPushTick", () => {
  it("pushes the departure warning once, to every device of the trip", async () => {
    const f = fakeDeps(at("2026-12-31T07:50"), { devices: [device(), device({ id: "dev-2", endpoint: "https://push.example/2" })] });
    expect(await runPushTick(f.deps)).toEqual({ trips: 1, sent: 2 });
    expect(f.sent.map((s) => s.device)).toEqual(["dev-1", "dev-2"]);
    expect(f.sent[0].payload).toMatchObject({ title: "ใกล้เวลาออก", url: "/" });
    expect(f.sent[0].payload.body).toMatch(/^อีก 10 นาทีต้องออก/);

    // next minute: same alert key → not sent again
    f.state.now += MINUTE;
    expect(await runPushTick(f.deps)).toEqual({ trips: 1, sent: 0 });
  });

  it("sends nothing outside alert windows or while driving", async () => {
    for (const local of ["2026-12-31T07:40", "2026-12-31T08:30"]) {
      const f = fakeDeps(at(local));
      await runPushTick(f.deps);
      expect(f.sent).toEqual([]);
    }
  });

  it("skips alerts that became due too long ago", async () => {
    // 07:45 is when the 15-minute warning became due; 11 minutes later is stale
    const f = fakeDeps(at("2026-12-31T07:56"));
    await runPushTick(f.deps);
    expect(f.sent).toEqual([]);
    expect(f.claimed.size).toBe(0);
  });

  it("removes devices whose subscription is gone", async () => {
    const f = fakeDeps(at("2026-12-31T07:50"), { sendResult: "gone" });
    await runPushTick(f.deps);
    expect(f.removed).toEqual(["dev-1"]);
  });

  it("ignores devices whose trip no longer exists", async () => {
    const f = fakeDeps(at("2026-12-31T07:50"), { devices: [device({ trip_id: "missing" })] });
    expect(await runPushTick(f.deps)).toEqual({ trips: 1, sent: 0 });
  });
});
