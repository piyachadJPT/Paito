import type { JSX } from "react";
import type { SkySlot } from "@/lib/scene";
import { INK } from "./palette";

/** Each sky is drawn in the 320×150 postcard box; `uid` keeps gradient ids unique per instance. */
export type SkyArt = (props: { uid: string }) => JSX.Element;

function Gradient({ id, stops }: { id: string; stops: string[] }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map((c, i) => (
          <stop key={c + i} offset={i / (stops.length - 1)} stopColor={c} />
        ))}
      </linearGradient>
    </defs>
  );
}

function Stars({ points, color = "#fff" }: { points: [number, number, number][]; color?: string }) {
  return (
    <g fill={color}>
      {points.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 12c-1-6 5-9 9-6 2-6 11-7 14-1 5-2 10 2 9 7Z"
      fill="#fffdf7"
      stroke={INK}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
}

function Birds({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" transform={`translate(${x} ${y})`}>
      <path d="M0 4q3-4 6 0q3-4 6 0" />
      <path d="M18 0q2.5-3 5 0q2.5-3 5 0" />
    </g>
  );
}

const Dawn: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#6f6a9e", "#d99bb0", "#f6d3b0"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <circle cx="236" cy="96" r="22" fill="#ffd9a0" />
    <Stars points={[[40, 18, 1], [110, 10, 1.2], [290, 14, 1]]} />
  </>
);

const Morning: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#9cc6e2", "#cfe2ea", "#f6dcc0"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <circle cx="250" cy="42" r="17" fill="#fff2c8" />
    <Birds x={60} y={34} />
  </>
);

const Day: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#86bfe4", "#bfe0ef", "#e2f1f6"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <circle cx="272" cy="26" r="14" fill="#fff6d8" />
    <Cloud x={30} y={22} />
    <Cloud x={190} y={40} s={0.8} />
  </>
);

const Evening: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#e98a6a", "#f3b07a", "#f7d39c"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <circle cx="70" cy="88" r="25" fill="#f2724a" />
    <Birds x={210} y={40} />
  </>
);

const Moon = ({ x, y, r, sky }: { x: number; y: number; r: number; sky: string }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#f4ead0" />
    <circle cx={x - r * 0.45} cy={y - r * 0.25} r={r * 0.85} fill={sky} />
  </g>
);

const Night: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#1d2752", "#2f3c6e", "#4a568a"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <Moon x={258} y={34} r={14} sky="#1f2954" />
    <Stars points={[[30, 20, 1.3], [80, 44, 1], [130, 16, 1.4], [175, 52, 1], [210, 24, 1.2], [300, 64, 1.1], [60, 70, 0.9]]} />
  </>
);

const Late: SkyArt = ({ uid }) => (
  <>
    <Gradient id={`${uid}-sky`} stops={["#0b0f25", "#161d40", "#252e58"]} />
    <rect width="320" height="150" fill={`url(#${uid}-sky)`} />
    <Moon x={64} y={30} r={11} sky="#0c1027" />
    <Stars
      points={[
        [20, 50, 1], [44, 12, 1.2], [96, 40, 1.4], [118, 14, 1], [150, 30, 1.1], [180, 10, 1.3], [204, 46, 1],
        [232, 22, 1.4], [262, 54, 1], [284, 16, 1.2], [306, 38, 1], [136, 62, 0.9], [250, 72, 0.9], [12, 26, 0.9],
      ]}
    />
  </>
);

export const SKY: Record<SkySlot, SkyArt> = {
  dawn: Dawn,
  morning: Morning,
  day: Day,
  evening: Evening,
  night: Night,
  late: Late,
};
