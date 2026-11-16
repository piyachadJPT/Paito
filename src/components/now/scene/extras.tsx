import type { JSX } from "react";
import type { SceneExtra } from "@/lib/scene";
import { INK, PAPER, RED, stroke } from "./palette";

export type ExtraArt = () => JSX.Element;

function Burst({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const rays = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const x1 = x + Math.cos(a) * r * 0.35;
    const y1 = y + Math.sin(a) * r * 0.35;
    const x2 = x + Math.cos(a) * r;
    const y2 = y + Math.sin(a) * r;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join("");
  return (
    <g>
      <path d={rays} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <circle cx={x} cy={y} r={2.2} fill={color} />
    </g>
  );
}

const Fireworks: ExtraArt = () => (
  <>
    <Burst x={58} y={30} r={18} color="#ffd36b" />
    <Burst x={136} y={18} r={13} color="#ff9fb0" />
    <Burst x={226} y={36} r={20} color="#9fd8ff" />
  </>
);

const FLAG_COLORS = [RED, "#e3b65e", "#5d8aa0", "#6f9a6a"];

const NewYear: ExtraArt = () => (
  <>
    <path d="M0 8Q160 34 320 8" fill="none" {...stroke(1.5)} />
    {Array.from({ length: 9 }, (_, i) => {
      const x = 18 + i * 36;
      const t = x / 320;
      const y = 8 + 4 * 26 * t * (1 - t); // on the string's curve
      return <path key={x} d={`M${x - 8} ${y}l8 13 8-13Z`} fill={FLAG_COLORS[i % 4]} {...stroke(1.2)} />;
    })}
    <g transform="translate(160 44) rotate(-3)">
      <rect x={-56} y={-12} width={112} height={24} rx={4} fill={PAPER} {...stroke(1.5)} />
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={RED}
        style={{ fontFamily: "var(--font-hand)" }}
      >
        สวัสดีปีใหม่
      </text>
    </g>
  </>
);

const Alarm: ExtraArt = () => (
  <g transform="translate(290 32) rotate(10)" {...stroke(2)}>
    <path d="M-12 -12l-5-4M12 -12l5-4" fill="none" />
    <circle cx={-11} cy={-13} r={5} fill={RED} />
    <circle cx={11} cy={-13} r={5} fill={RED} />
    <circle cx={0} cy={0} r={14} fill={PAPER} />
    <path d="M0 -8V0l6 4" fill="none" stroke={INK} />
    <path d="M-9 13l-3 4M9 13l3 4" fill="none" />
  </g>
);

export const EXTRAS: Record<SceneExtra, ExtraArt> = {
  fireworks: Fireworks,
  new_year: NewYear,
  alarm: Alarm,
};
