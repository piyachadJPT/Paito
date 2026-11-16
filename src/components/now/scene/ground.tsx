import type { SkySlot } from "@/lib/scene";
import { WOOD, WOOD_DARK, stroke } from "./palette";

/** Northern Thai ridges under each sky: far ridge, near ridge, foreground. */
const RIDGES: Record<SkySlot, [far: string, near: string, front: string]> = {
  dawn: ["#9a8fb5", "#706a94", "#cdbfa8"],
  morning: ["#8fb0c4", "#5d8aa0", "#d9caa9"],
  day: ["#8fb89a", "#5a8f6a", "#d9cfa4"],
  evening: ["#b5806e", "#7e5449", "#caa684"],
  night: ["#2f3a66", "#222b52", "#3a3f5c"],
  late: ["#1b2244", "#141a36", "#262a42"],
};

export function Ground({ sky }: { sky: SkySlot }) {
  const [far, near, front] = RIDGES[sky];
  return (
    <>
      <path d="M0 92 Q30 70 62 84 T128 64 T196 82 T262 62 T320 76 V150 H0Z" fill={far} />
      <path d="M0 110 Q48 92 96 106 T196 96 T278 108 T320 102 V150 H0Z" fill={near} />
      <path d="M0 124 Q80 116 160 122 T320 120 V150 H0Z" fill={front} />
    </>
  );
}

/** Desk top for the "objects on a table" pictures (before/after the trip, empty). */
export function Desk() {
  return (
    <>
      <path d="M0 116 H320 V150 H0Z" fill={WOOD} />
      <path d="M0 116 H320" {...stroke(2)} fill="none" />
      <path d="M30 130 Q80 127 120 131 M190 138 Q240 135 290 139" fill="none" stroke={WOOD_DARK} strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
}
