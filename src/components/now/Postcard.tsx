import type { ReactNode } from "react";
import { Stamp } from "@/components/ui/Stamp";
import type { Scene } from "@/lib/scene";
import { PostcardScene } from "./scene/PostcardScene";

/** Long names are cut so the arrival time in the postmark always shows. */
function shorten(name: string, max = 22): string {
  const chars = Array.from(name);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : name;
}

/**
 * The Now page's main card (design doc §6.2): a taped, slightly tilted postcard
 * with the scene picture, a postmark (where) and a postage stamp (key time).
 */
export function Postcard({
  scene,
  pictureHeight,
  postmark,
  stamp,
  label = "ตอนนี้",
  children,
}: {
  scene: Scene;
  pictureHeight: number;
  /** [place name, optional second line such as "ถึง 09:30"] */
  postmark?: [string, string?];
  stamp?: { label: string; value: string };
  label?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="relative mt-1.5 -rotate-[1.2deg] bg-card p-2.5 pb-4 shadow-[var(--shadow-card)]">
      {/* washi tape */}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-6 w-[84px] -translate-x-1/2 rotate-[2.5deg] bg-[rgb(222_184_110/0.6)] [clip-path:polygon(3%_0,97%_4%,100%_50%,96%_100%,2%_96%,0_45%)]"
      />
      <div className="relative overflow-hidden">
        {pictureHeight > 0 && <PostcardScene scene={scene} height={pictureHeight} />}
        {postmark && pictureHeight >= 96 && (
          <Stamp tone="postmark" size="md" clamp={false} className="absolute bottom-2 left-3">
            {/* the name may take two lines; the time line always shows */}
            <span className="line-clamp-2">{shorten(postmark[0], 16)}</span>
            {postmark[1] && (
              <>
                {" "}
                <span className="block">{postmark[1]}</span>
              </>
            )}
          </Stamp>
        )}
      </div>
      {/* compact mode (thin sky strip): the time is in the card text anyway */}
      {stamp && pictureHeight >= 72 && (
        <div className="absolute -top-2 right-3 z-10 rotate-[5deg] bg-card p-1 shadow-[0_1px_3px_rgb(0_0_0/0.25)]">
          <div className="flex h-[66px] w-[56px] flex-col items-center justify-center bg-ink-red text-white outline-2 -outline-offset-[5px] outline-white/70 outline-dotted">
            <span className="font-hand text-[11px] leading-tight font-semibold">{stamp.label}</span>{" "}
            <span className="font-[family-name:var(--font-rounded)] text-[15px] leading-tight font-bold tabular-nums">{stamp.value}</span>
          </div>
        </div>
      )}
      <div className={`px-2.5 ${pictureHeight >= 72 ? "pt-3" : "pt-2"}`}>{children}</div>
    </section>
  );
}
