import { useId } from "react";
import type { Scene } from "@/lib/scene";
import { EXTRAS } from "./extras";
import { Desk, Ground } from "./ground";
import { SKY } from "./sky";
import { DESK_SUBJECTS, SUBJECTS } from "./subjects";

const DARK_SKIES = new Set(["night", "late"]);

/**
 * The postcard picture: sky → ground (or desk) → subject → extras.
 * Decorative only (every fact is also in the card's text), so aria-hidden.
 */
export function PostcardScene({ scene, height, className = "" }: { scene: Scene; height: number; className?: string }) {
  // useId may contain characters that break url(#…) references
  const uid = `pc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const Sky = SKY[scene.sky];
  const Subject = SUBJECTS[scene.subject];
  const onDesk = DESK_SUBJECTS.has(scene.subject);

  return (
    <svg
      aria-hidden
      viewBox="0 0 320 150"
      preserveAspectRatio="xMidYMid slice"
      className={`block w-full ${className}`}
      style={{ height }}
    >
      <g data-layer="sky">
        <Sky uid={uid} />
      </g>
      <g data-layer="ground">{onDesk ? <Desk /> : <Ground sky={scene.sky} />}</g>
      <g data-layer="subject">
        <Subject />
        {/* night wash keeps the subject in the same light as the sky */}
        {DARK_SKIES.has(scene.sky) && !onDesk && <rect width="320" height="150" fill="#10163a" opacity={0.22} />}
      </g>
      {scene.extras.map((extra) => {
        const Extra = EXTRAS[extra];
        return (
          <g key={extra} data-layer={extra}>
            <Extra />
          </g>
        );
      })}
    </svg>
  );
}
