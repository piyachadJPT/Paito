import type { JSX } from "react";
import type { SceneSubject } from "@/lib/scene";
import {
  BRICK, CREAM, CURRY, GOLD, GOLD_DARK, INK, LAMP, LEAF, LEAF_DARK, PAPER, RED, ROAD, WATER, WOOD, WOOD_DARK, stroke,
} from "./palette";

/*
 * Subjects sit centred on the ground line (y ≈ 118) of the 320×150 postcard and
 * keep their key shapes inside y 45–118, so they still read when the picture is
 * cropped to 72px. Flat fills + 2px ink outline, like the rest of the set.
 */
export type SubjectArt = () => JSX.Element;

const S = stroke();

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" {...stroke(1.8)} opacity={0.7}>
      <path d={`M${x} ${y}c-4-5 4-8 0-14`} />
      <path d={`M${x + 9} ${y - 2}c-4-5 4-8 0-14`} />
      <path d={`M${x + 18} ${y}c-4-5 4-8 0-14`} />
    </g>
  );
}

function Car({ x, y, color = RED, flip = false }: { x: number; y: number; color?: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} {...S}>
      <path d="M-30 0c-1-7 2-11 8-12l7-10c9-2 19-2 27 0l8 10c6 1 9 5 8 12Z" fill={color} />
      <path d="M-13 -21l-5 9h14v-10M3 -22v10h14l-5-9" fill="#d6ecf6" />
      <circle cx="-17" cy="1" r="6" fill={INK} />
      <circle cx="17" cy="1" r="6" fill={INK} />
      <circle cx="-17" cy="1" r="2" fill={PAPER} stroke="none" />
      <circle cx="17" cy="1" r="2" fill={PAPER} stroke="none" />
    </g>
  );
}

function House({ x, y, w = 70, lit = true, chimney = false }: { x: number; y: number; w?: number; lit?: boolean; chimney?: boolean }) {
  const h = w * 0.55;
  return (
    <g {...S}>
      {chimney && <path d={`M${x + w * 0.62} ${y - h - 14}v-14h9v20`} fill={BRICK} />}
      <path d={`M${x - 6} ${y - h}L${x + w / 2} ${y - h - w * 0.42}L${x + w + 6} ${y - h}Z`} fill={BRICK} />
      <path d={`M${x} ${y - h}h${w}v${h}h-${w}Z`} fill={CREAM} />
      <path d={`M${x + w * 0.14} ${y - h * 0.72}h${w * 0.24}v${h * 0.36}h-${w * 0.24}Z`} fill={lit ? LAMP : "#c9d7de"} />
      <path d={`M${x + w * 0.58} ${y}v-${h * 0.62}h${w * 0.24}v${h * 0.62}`} fill={WOOD} />
    </g>
  );
}

const Temple: SubjectArt = () => (
  <g {...S}>
    <path d="M118 118h84v-8h-84Z" fill={CREAM} />
    <path d="M126 110h68v-7h-68Z" fill={GOLD_DARK} />
    <path d="M134 103c2-22 13-36 26-40 13 4 24 18 26 40Z" fill={GOLD} />
    <path d="M142 82h36M138 92h44" fill="none" stroke={GOLD_DARK} />
    <path d="M152 63l8-30 8 30Z" fill={GOLD} />
    <path d="M160 33v-9" />
    <circle cx="160" cy="22" r="2.5" fill={GOLD} />
    <path d="M96 118v-14l8-6 8 6v14M228 118v-14l-8-6-8 6v14" fill={CREAM} />
  </g>
);

const Viewpoint: SubjectArt = () => (
  <g {...S}>
    <path d="M78 118L160 46l82 72Z" fill="#7a9a82" />
    <path d="M140 64l20-18 20 18-8 6-6-5-6 6-6-5-6 5Z" fill={PAPER} />
    <path d="M160 46V24" />
    <path d="M160 24l20 6-20 7Z" fill={RED} />
    <path d="M70 118c10-10 26-10 34-2 8-8 22-8 30 0M186 118c8-8 22-8 30 0 8-8 22-6 30 2" fill={PAPER} opacity={0.9} />
  </g>
);

const Waterfall: SubjectArt = () => (
  <g {...S}>
    <path d="M100 118V62c10-10 26-12 44-8v64Z" fill="#8a7d6c" />
    <path d="M220 118V58c-12-8-28-8-44-2v62Z" fill="#7a6e5e" />
    <path d="M144 54c10-3 22-3 32 0v58h-32Z" fill={WATER} />
    <path d="M152 62v40M160 58v48M168 64v38" fill="none" stroke={PAPER} strokeWidth={2} />
    <path d="M120 118c10-10 70-10 80 0Z" fill={WATER} />
    <path d="M140 112c4-4 8-4 10 0M170 112c4-4 8-4 10 0" fill="none" stroke={PAPER} />
    <path d="M92 70c6-10 18-12 22-4M206 66c6-8 18-6 20 2" fill={LEAF} />
  </g>
);

const Museum: SubjectArt = () => (
  <g {...S}>
    <path d="M104 72L160 46l56 26Z" fill={CREAM} />
    <circle cx="160" cy="62" r="5" fill={GOLD} />
    <path d="M110 72h100v6h-100Z" fill={CREAM} />
    <path d="M118 78v32M138 78v32M182 78v32M202 78v32" fill="none" strokeWidth={4} stroke={INK} />
    <path d="M117 78v32M137 78v32M181 78v32M201 78v32" fill="none" strokeWidth={2} stroke={PAPER} />
    <path d="M148 110V88h24v22" fill={WOOD} />
    <path d="M102 110h116v8h-116Z" fill={CREAM} />
    <path d="M150 92h20v12h-20Z" fill={GOLD} transform="translate(-36 -8) rotate(-4 160 98)" />
  </g>
);

const Market: SubjectArt = () => (
  <g {...S}>
    <path d="M86 46q74-10 148 0" fill="none" strokeWidth={1.5} />
    {[100, 130, 160, 190, 220].map((x, i) => (
      <g key={x}>
        <path d={`M${x} ${44 - (i % 2) * 2}v4`} fill="none" strokeWidth={1.5} />
        <ellipse cx={x} cy={54 - (i % 2) * 2} rx="6" ry="7" fill={RED} />
      </g>
    ))}
    <path d="M100 66h120l6 12c-7 6-14 6-20 0-7 6-14 6-20 0-7 6-14 6-20 0-7 6-14 6-20 0-7 6-14 6-20 0-7 6-14 6-20 0Z" fill={PAPER} />
    <path d="M114 66l-4 12M134 66v12M154 66l2 12M174 66l2 12M194 66l4 12" fill="none" stroke={RED} strokeWidth={5} />
    <path d="M106 80v38M214 80v38" fill="none" />
    <path d="M100 96h120v22h-120Z" fill={WOOD} />
    <g fill="#e9784a">
      <circle cx="120" cy="91" r="6" />
      <circle cx="132" cy="92" r="5" />
    </g>
    <g fill={LEAF}>
      <circle cx="170" cy="91" r="6" />
      <circle cx="182" cy="92" r="5" />
      <circle cx="198" cy="91" r="6" fill={GOLD} />
    </g>
  </g>
);

const Farm: SubjectArt = () => (
  <g {...S}>
    {[
      [70, 120, 250, 104],
      [86, 108, 236, 92],
      [102, 96, 220, 80],
    ].map(([x1, y1, x2, y2], row) => (
      <path
        key={row}
        d={`M${x1} ${y1}${Array.from({ length: 7 }, (_, i) => {
          const x = x1 + ((x2 - x1) / 7) * (i + 1);
          const y = y1 + ((y2 - y1) / 7) * (i + 1);
          return `Q${x - (x2 - x1) / 14} ${y - 18} ${x} ${y}`;
        }).join("")}Z`}
        fill={row === 1 ? LEAF_DARK : LEAF}
      />
    ))}
    <path d="M232 70l12-10 12 10v14h-24Z" fill={CREAM} />
    <path d="M226 72l18-16 18 16" fill="none" />
    <path d="M140 62c4-8 16-8 20 0Z" fill={GOLD} />
    <path d="M134 62h32" />
  </g>
);

const Sight: SubjectArt = () => (
  <g {...S}>
    <path d="M122 72h20l6-9h24l6 9h20c4 0 6 2 6 6v34c0 4-2 6-6 6h-76c-4 0-6-2-6-6V78c0-4 2-6 6-6Z" fill="#5d6b78" />
    <circle cx="160" cy="94" r="17" fill={PAPER} />
    <circle cx="160" cy="94" r="10" fill="#2d3a46" />
    <circle cx="156" cy="90" r="3" fill={PAPER} stroke="none" />
    <path d="M190 78h8" />
    <path d="M226 118c-10-14-18-24-18-32a18 18 0 0 1 36 0c0 8-8 18-18 32Z" fill={RED} />
    <circle cx="226" cy="86" r="6" fill={PAPER} />
  </g>
);

const Bowl = ({ x, w, fill = PAPER }: { x: number; w: number; fill?: string }) => (
  <path d={`M${x} 92h${w}c-2 16-14 26-${w / 2} 26s-${w / 2 - 2}-10-${w / 2}-26Z`} fill={fill} />
);

const Breakfast: SubjectArt = () => (
  <g {...S}>
    <Bowl x={92} w={70} />
    <path d="M94 92c10-6 56-6 66 0" fill={CREAM} />
    <circle cx="127" cy="90" r="5" fill={GOLD} />
    <Steam x={110} y={80} />
    <path d="M176 116h60" />
    <path d="M182 110l40-14M186 98l40 14" fill="none" stroke={GOLD_DARK} strokeWidth={8} />
    <path d="M182 110l40-14M186 98l40 14" fill="none" strokeWidth={2} />
    <path d="M238 118l-4-30h22l-4 30Z" fill="#6b4a2e" />
    <path d="M236 96h18" fill="none" stroke={CREAM} />
  </g>
);

const Lunch: SubjectArt = () => (
  <g {...S}>
    <Bowl x={110} w={100} />
    <path d="M112 92c20-8 76-8 96 0" fill={CURRY} />
    <path d="M140 86c6-10 14-4 20-10 6 6 14 0 20 10-12 4-28 4-40 0Z" fill={GOLD} />
    <path d="M146 82l6-4M158 80l4-6M168 80l6-4" fill="none" stroke={GOLD_DARK} />
    <path d="M196 70l40-30M204 74l40-30" fill="none" stroke={WOOD_DARK} strokeWidth={3} />
    <circle cx="128" cy="90" r="3" fill={LEAF} stroke="none" />
    <Steam x={128} y={72} />
  </g>
);

const Dinner: SubjectArt = () => (
  <g {...S}>
    <ellipse cx="160" cy="104" rx="64" ry="14" fill="#5a4636" />
    <ellipse cx="160" cy="100" rx="56" ry="10" fill="#d7b48a" />
    <path d="M128 98c4-20 60-20 64 0Z" fill="#3e3a36" />
    <path d="M138 90l10-6M156 84l12-2M172 88l10 2" fill="none" stroke="#e98f8f" strokeWidth={5} />
    <path d="M138 90l10-6M156 84l12-2M172 88l10 2" fill="none" strokeWidth={1.5} />
    <path d="M110 118l100 0" />
    <Steam x={150} y={64} />
    <ellipse cx="244" cy="112" rx="16" ry="5" fill={PAPER} />
    <circle cx="240" cy="108" r="4" fill={LEAF} />
  </g>
);

const LateMeal: SubjectArt = () => (
  <g {...S}>
    <path d="M160 22v14" fill="none" />
    <path d="M140 50l8-14h24l8 14Z" fill={RED} />
    <path d="M128 96q32-40 64 0" fill={LAMP} opacity={0.35} stroke="none" />
    <circle cx="160" cy="54" r="5" fill={LAMP} />
    <Bowl x={124} w={72} fill="#d9e4ea" />
    <path d="M128 92c14-6 50-6 64 0" fill="#c9844a" />
    <path d="M138 90c8-3 14 3 22 0s14 3 22 0" fill="none" stroke={CREAM} strokeWidth={2.5} />
    <path d="M186 82l30-24M192 86l30-24" fill="none" stroke={WOOD_DARK} strokeWidth={3} />
  </g>
);

const Cafe: SubjectArt = () => (
  <g {...S}>
    <ellipse cx="156" cy="114" rx="46" ry="6" fill={PAPER} />
    <path d="M124 78h64c0 20-12 34-32 34s-32-14-32-34Z" fill={PAPER} />
    <path d="M188 84c14-4 18 12 4 18" fill="none" />
    <ellipse cx="156" cy="80" rx="30" ry="5" fill="#a3703f" />
    <path d="M150 80c0-4 6-4 6 0 0-4 6-4 6 0-1 3-6 5-6 5s-5-2-6-5Z" fill={CREAM} strokeWidth={1.2} />
    <Steam x={138} y={68} />
    <path d="M224 118h22l3-18h-28Z" fill={BRICK} />
    <path d="M235 100c-10-8-6-20 0-24 6 4 10 16 0 24M235 100c-8-2-14-8-14-14" fill={LEAF} />
  </g>
);

const RestStop: SubjectArt = () => (
  <g {...S}>
    <path d="M118 118V64h40v54" fill={RED} />
    <path d="M124 72h28v16h-28Z" fill={PAPER} />
    <path d="M158 82c14 0 16 8 16 18v8" fill="none" strokeWidth={2.5} />
    <path d="M170 108h8v6h-8Z" fill={INK} />
    <path d="M114 118h48" />
    <path d="M196 70l26-16 26 16Z" fill={BRICK} />
    <path d="M202 70v48M242 70v48" fill="none" strokeWidth={3} />
    <path d="M206 100h32v6h-32Z" fill={WOOD} />
  </g>
);

const Lodging: SubjectArt = () => (
  <g>
    <House x={124} y={118} w={72} />
    <g {...S}>
      <path d="M224 118v-20" fill="none" stroke={WOOD_DARK} strokeWidth={3} />
      <path d="M224 100c-14 0-16-20-4-24 0-12 18-12 18 0 12 4 10 24-4 24Z" fill={LEAF} />
    </g>
  </g>
);

const Departing: SubjectArt = () => (
  <g>
    {/* kept right of centre: the postmark sits bottom-left */}
    <House x={118} y={118} w={64} />
    <Car x={236} y={112} />
    <g {...S}>
      <path d="M222 84h28v6h-28Z" fill={WOOD} />
      <path d="M226 84v-12h20v12" fill="#4f7aa0" />
      <path d="M232 72v-4h8v4" fill="none" />
    </g>
  </g>
);

const Driving: SubjectArt = () => (
  <g>
    <path d="M60 150C120 130 200 120 190 100S220 80 250 72L262 74C236 84 214 92 206 104S150 136 116 150Z" fill={ROAD} {...S} />
    <path d="M90 146C140 132 196 120 198 102S226 84 256 74" fill="none" stroke={PAPER} strokeWidth={2} strokeDasharray="6 6" />
    <Car x={150} y={128} />
  </g>
);

const Arriving: SubjectArt = () => (
  <g>
    <path d="M40 124C120 118 200 118 280 122" fill="none" stroke={ROAD} strokeWidth={10} strokeLinecap="round" />
    <Car x={120} y={116} />
    <g {...S}>
      <path d="M210 118c-14-18-24-30-24-42a24 24 0 0 1 48 0c0 12-10 24-24 42Z" fill={RED} />
      <circle cx="210" cy="76" r="8" fill={PAPER} />
      <path d="M236 52V26" fill="none" />
      <path d="M236 26l18 6-18 6Z" fill={GOLD} />
    </g>
  </g>
);

const NightIn: SubjectArt = () => (
  <g>
    <House x={120} y={118} w={80} chimney />
    <path d="M174 52c-6-6 4-10-2-16" fill="none" {...stroke(1.6)} opacity={0.6} />
    <path d="M136 106q24-16 48 0" fill={LAMP} opacity={0.25} />
  </g>
);

const BeforeTrip: SubjectArt = () => (
  <g {...S}>
    <path d="M98 116V74c0-4 2-6 6-6h60c4 0 6 2 6 6v42Z" fill="#4f7aa0" />
    <path d="M120 68v-8c0-3 2-4 4-4h20c2 0 4 1 4 4v8" fill="none" strokeWidth={3} />
    <path d="M98 92h72" fill="none" />
    <circle cx="116" cy="82" r="6" fill={GOLD} />
    <path d="M140 100h18v10h-18Z" fill={RED} transform="rotate(-8 149 105)" />
    <path d="M192 116V58h52v58Z" fill={PAPER} />
    <path d="M192 58h52v12h-52Z" fill={RED} />
    <path d="M202 52v10M234 52v10" fill="none" />
    <path d="M200 80h36M200 90h36M200 100h36" fill="none" stroke={INK} strokeWidth={1} opacity={0.4} />
    <ellipse cx="227" cy="95" rx="9" ry="7" fill="none" stroke={RED} strokeWidth={2.2} />
  </g>
);

const TripDone: SubjectArt = () => (
  <g {...S}>
    <path d="M98 108l40-6 6 40-40 6Z" fill={PAPER} transform="translate(0 -36) rotate(-10 120 120)" />
    <path d="M104 74l30-4 3 22-30 4Z" fill="#9cc6e2" transform="rotate(-10 120 84)" />
    <path d="M130 66l42 2-2 42-42-2Z" fill={PAPER} />
    <path d="M136 72l30 1-1 26-30-1Z" fill={GOLD} />
    <path d="M140 92l8-10 6 6 6-8 6 12" fill="none" />
    <path d="M176 70l40 8-8 40-40-8Z" fill={PAPER} transform="rotate(4 196 94)" />
    <path d="M182 78l28 6-5 26-28-6Z" fill="#7a9a82" transform="rotate(4 196 94)" />
    <Car x={250} y={112} color="#4f7aa0" />
    <path d="M250 82c-4-6-12-2-8 4l8 8 8-8c4-6-4-10-8-4Z" fill={RED} />
  </g>
);

const Empty: SubjectArt = () => (
  <g {...S}>
    <path d="M90 108V54h140v54Z" fill={PAPER} transform="rotate(-3 160 81)" />
    <path d="M160 60v44" fill="none" transform="rotate(-3 160 81)" />
    <path d="M172 72h44M172 84h44M172 96h32" fill="none" strokeWidth={1.2} opacity={0.5} transform="rotate(-3 160 81)" />
    <path d="M206 58h18v20h-18Z" fill="none" strokeDasharray="3 3" transform="rotate(-3 160 81)" />
    <path d="M110 70c10 6 26-6 36 2" fill="none" strokeDasharray="4 4" transform="rotate(-3 160 81)" />
    <path d="M232 112l40-40 6 6-40 40-9 3Z" fill={GOLD} />
    <path d="M272 72l6 6 4-4c2-2 0-6-2-6l-4 0Z" fill="#e98f8f" />
  </g>
);

export const SUBJECTS: Record<SceneSubject, SubjectArt> = {
  temple: Temple,
  viewpoint: Viewpoint,
  waterfall: Waterfall,
  museum: Museum,
  market: Market,
  farm: Farm,
  sight: Sight,
  breakfast: Breakfast,
  lunch: Lunch,
  dinner: Dinner,
  late_meal: LateMeal,
  cafe: Cafe,
  rest_stop: RestStop,
  lodging: Lodging,
  departing: Departing,
  driving: Driving,
  arriving: Arriving,
  night_in: NightIn,
  before_trip: BeforeTrip,
  trip_done: TripDone,
  empty: Empty,
};

/** Subjects drawn on a desk top instead of the mountain ground. */
export const DESK_SUBJECTS: ReadonlySet<SceneSubject> = new Set(["before_trip", "trip_done", "empty"]);
