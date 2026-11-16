import type { ReactNode } from "react";

/**
 * Hand-drawn icon set (SPEC U11). 24×24, 2px ink strokes with round ends and
 * slightly uneven lines, so they read like a pen sketch in the journal.
 * Strokes use currentColor; small filled details use the same color.
 */
export type HandIconName =
  | "now"
  | "plan"
  | "settings"
  | "sight"
  | "food"
  | "rest"
  | "lodging"
  | "navigate"
  | "check"
  | "clock"
  | "skip"
  | "arrive"
  | "calendar"
  | "close"
  | "bell"
  | "warning"
  | "lock"
  | "car"
  | "phone"
  | "notebook"
  | "party"
  | "user"
  | "logout"
  | "upload"
  | "download"
  | "plus"
  | "minus"
  | "trash"
  | "refresh"
  | "undo"
  | "flask"
  | "cloud"
  | "cloudOff"
  | "cloudUp"
  | "cloudAlert"
  | "alert"
  | "up"
  | "down";

export const HAND_ICON_PATHS: Record<HandIconName, ReactNode> = {
  // clock face with hands
  now: (
    <>
      <path d="M12 3.4c4.9-.2 8.7 3.6 8.6 8.5-.1 4.8-3.9 8.6-8.7 8.6-4.8.1-8.5-3.8-8.4-8.7.1-4.6 3.8-8.3 8.5-8.4Z" />
      <path d="M12.1 7.3 12 12.3l3.3 1.8" />
    </>
  ),
  // ruled notebook
  plan: (
    <>
      <path d="M5.2 4.4 18.4 4.1c.4 5.2.5 10.3.3 15.5l-13.3.3c-.3-5.2-.4-10.3-.2-15.5Z" />
      <path d="M8.6 9 15.4 8.8M8.6 12.4l6.2-.1M8.6 15.8l4-.1" />
    </>
  ),
  // three sliders
  settings: (
    <>
      <path d="M4.4 7.1 19.5 7M4.6 12.1l14.7.1M4.4 17.1l15.1-.1" />
      <path d="M9 5.1c1.2 0 2 .9 2 2s-.9 2-2 2-2-1-2-2.1c0-1 .9-1.9 2-1.9ZM15.5 10.1c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2ZM8 15c1.2 0 2 1 2 2.1 0 1-.9 2-2 1.9-1.1 0-2-.9-2-2s.9-2 2-2Z" fill="var(--icon-fill, var(--card))" />
    </>
  ),
  // chedi (temple spire)
  sight: (
    <>
      <path d="M12 2.8 12.2 6.6" />
      <path d="M8.6 19.4 9.1 10.1C10 7.9 11 6.8 12 6.6c1.1.3 2.2 1.4 3.1 3.6l.5 9.1" />
      <path d="M7.4 13.1 16.8 13M4.8 19.6l14.5-.2" />
    </>
  ),
  // bowl with steam
  food: (
    <>
      <path d="M4.3 11.6c5.2-.3 10.3-.3 15.4 0-.4 4.4-3.5 7.6-7.7 7.6-4.3 0-7.3-3.2-7.7-7.6Z" />
      <path d="M9 8.6c-.8-1 .7-1.9-.1-3.1M12.2 8.4c-.8-1.1.8-2-.1-3.3M15.3 8.6c-.7-1 .8-1.9 0-3" />
    </>
  ),
  // coffee cup
  rest: (
    <>
      <path d="M4.8 9.4 16.3 9.2c.1 4.7-1.6 9.4-5.8 9.6-4.2.1-5.8-4.6-5.7-9.4Z" />
      <path d="M16.2 11c2.3-.4 3.5.6 3.2 2-.3 1.5-2 2.1-3.8 2" />
      <path d="M9 6.8c-.5-.9.4-1.6 0-2.6M12.1 6.7c-.5-.9.4-1.6 0-2.6" />
    </>
  ),
  // little house with lit window
  lodging: (
    <>
      <path d="M3.9 11.4 12.1 4.3l8 7.4" />
      <path d="M6.1 9.8 6.3 19.7l11.6-.2-.2-9.7" />
      <path d="M10.3 19.6v-4.9l3.5-.1v5" />
    </>
  ),
  // paper plane / navigation arrow
  navigate: <path d="M4.2 11.3 19.6 4.5l-6.4 15.3-1.6-7.2Z" />,
  check: <path d="M4.6 12.8c1.8 1.6 3.4 3.3 5 5.3 2.7-5.1 6-9.4 10.2-12.8" />,
  // clock with plus
  clock: (
    <>
      <path d="M11.4 4.1c4.3-.2 7.7 3.1 7.6 7.4-.1 4.2-3.4 7.5-7.6 7.6-4.2.1-7.4-3.2-7.3-7.5.1-4 3.3-7.3 7.3-7.5Z" />
      <path d="M11.5 7.8 11.4 11.8l2.6 1.5" />
      <path d="M19.4 2.9v4.4M17.3 5.1h4.3" />
    </>
  ),
  // skip forward
  skip: (
    <>
      <path d="M5.2 5.6 13.4 12 5 18.5Z" />
      <path d="M18.6 5.3 18.8 18.7" />
    </>
  ),
  // map pin with tick
  arrive: (
    <>
      <path d="M12 20.6c-3.6-3.9-6.5-7.1-6.4-10.5.1-3.5 2.9-6 6.4-6 3.4.1 6.2 2.7 6.2 6.1 0 3.4-2.7 6.6-6.2 10.4Z" />
      <path d="M9.3 10.2 11.2 12l3.6-3.7" />
    </>
  ),
  calendar: (
    <>
      <path d="M4.3 6.4 19.6 6.1c.2 4.6.2 9.1 0 13.6L4.5 20c-.3-4.6-.3-9 -.2-13.6Z" />
      <path d="M4.5 10.4 19.5 10.2M8.4 3.9 8.5 7.8M15.5 3.8l.1 4" />
      <path d="M8 13.9h.1M12 13.8h.1M16 13.8h.1M8 16.9h.1M12 16.8h.1" strokeWidth="2.6" />
    </>
  ),
  close: <path d="M5.6 5.4c4.4 4.2 8.6 8.6 12.8 13.2M18.3 5.6c-4.5 4.1-8.7 8.4-12.6 13" />,
  bell: (
    <>
      <path d="M6.4 16.6c.6-1.6.4-4 .6-6 .4-3.3 2.5-5.4 5.1-5.4 2.7.1 4.7 2.2 5 5.5.2 2 0 4.3.7 5.9Z" />
      <path d="M4.7 16.7 19.4 16.5M10.3 19.6c.9 1.1 2.6 1.1 3.5 0M12 3.2v2" />
    </>
  ),
  warning: (
    <>
      <path d="M12.1 3.9 20.6 19.4 3.5 19.6Z" />
      <path d="M12 9.3 12.1 13.6M12.1 16.6h.1" />
    </>
  ),
  lock: (
    <>
      <path d="M5.4 10.6 18.7 10.4l-.2 9.3-13 .2Z" />
      <path d="M8.3 10.4c-.3-3.6 1.1-6 3.7-6 2.7 0 4 2.3 3.8 5.9" />
    </>
  ),
  car: (
    <>
      <path d="M3.6 16.2c-.2-2.1.3-3.6 2.2-4l2-4.2c2.8-.6 5.6-.6 8.4 0l2 4.1c1.9.5 2.4 2 2.2 4.1Z" />
      <path d="M7.2 16.4c0 1.2.6 2 1.4 2s1.4-.8 1.4-2M14.1 16.3c0 1.2.6 2 1.4 2s1.4-.8 1.4-2M6 12.1l12.2-.1" />
    </>
  ),
  phone: (
    <path d="M6.4 3.9 9.6 3.6l1.6 4.2-2.1 1.5c1.1 2.5 3 4.5 5.6 5.7l1.5-2.1 4.2 1.6-.3 3.3c-.2 1.3-1.5 2.2-2.9 1.9C10.4 18.4 5.5 13.6 4.4 6.8c-.2-1.4.6-2.7 2-2.9Z" />
  ),
  notebook: (
    <>
      <path d="M6.3 3.9 18.6 3.7l.2 16.5-12.4.2Z" />
      <path d="M4 7.8h4.2M4 12h4.2M4 16.2h4.2M11.5 8.5l4.4-.1M11.5 11.9l3.5-.1" />
    </>
  ),
  party: (
    <>
      <path d="M4 20.2 8.6 7.9l7.6 7.6Z" />
      <path d="M13.3 4.2c.3 1.5-.6 2.4-.1 3.8M17.4 6.7c-1.3.4-1.8 1.6-3.2 1.7M19.9 11c-1.5-.4-2.6.4-3.9 0" />
      <path d="M15.6 3.6h.1M20.3 8h.1M10.8 3.4h.1" strokeWidth="2.6" />
    </>
  ),
  user: (
    <>
      <path d="M12 4.3c2.3-.1 4 1.7 4 3.9 0 2.3-1.8 4-4 4s-4-1.8-3.9-4c0-2.2 1.7-3.9 3.9-3.9Z" />
      <path d="M4.8 19.8c.6-3.6 3.6-5.6 7.3-5.6 3.6.1 6.5 2 7.1 5.5" />
    </>
  ),
  logout: (
    <>
      <path d="M10.5 4.4 5 4.6l.2 15 5.3-.1" />
      <path d="M9.6 12.1 19.6 12M16 8.3l3.7 3.7-3.8 3.6" />
    </>
  ),
  // file with an up arrow
  upload: (
    <>
      <path d="M6 3.8 14.2 3.6l3.9 4 .1 12.6-12.1.2Z" />
      <path d="M14 3.8 14.1 8l4 -.2" />
      <path d="M12.1 17.4 12 11.2M9.4 13.7l2.6-2.6 2.7 2.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.2 12.1 14.6M8.2 11.1l3.9 3.8 3.8-3.9" />
      <path d="M4.6 15.4 4.8 19.6l14.6-.2-.1-4.1" />
    </>
  ),
  plus: <path d="M12.1 5 11.9 19.1M5 12.1l14.1-.2" />,
  minus: <path d="M5 12.2 19.1 11.9" />,
  trash: (
    <>
      <path d="M4.5 6.6 19.6 6.4M9.4 6.4l.4-2.4h4.6l.4 2.4" />
      <path d="M6.4 6.6 7.4 20l9.4-.1 1-13.4" />
      <path d="M10.2 10.4l.2 6M13.9 10.3l-.2 6.1" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.2 11.6c-.1-3.9-3.2-7-7.2-7-2.7 0-4.9 1.4-6.2 3.6" />
      <path d="M4.8 12.5c.2 3.9 3.3 6.9 7.2 6.9 2.7 0 5-1.5 6.2-3.7" />
      <path d="M5.4 4.2 5.8 8.4l4.1-.4M18.6 19.8l-.4-4.2-4.2.4" />
    </>
  ),
  undo: (
    <>
      <path d="M8.4 5 4.6 9l4 3.7" />
      <path d="M4.8 9c6.1-.3 10.6.2 13 2.6 2.1 2.2 1.6 6-1.9 7.6-1.4.7-3.1.8-5 .7" />
    </>
  ),
  flask: (
    <>
      <path d="M9.6 3.8 14.4 3.7M10.2 3.9 10.1 9.4 4.9 18.4c-.6 1 .1 1.9 1.2 1.9l11.8-.1c1.1 0 1.8-1 1.2-1.9l-5.2-9-.1-5.5" />
      <path d="M7.4 14.2c3.1-.6 6-.4 9.3.1" />
    </>
  ),
  cloud: <path d="M7.1 18.4c-2.6 0-4-1.8-3.8-3.8.2-1.9 1.7-3.2 3.6-3.1.4-3.4 2.9-5.4 5.8-5.3 2.8.1 5 2.2 5.3 5 2 .2 3.4 1.6 3.3 3.6-.1 2-1.6 3.5-3.7 3.5Z" />,
  cloudOff: (
    <>
      <path d="M7.1 18.4c-2.6 0-4-1.8-3.8-3.8.2-1.9 1.7-3.2 3.6-3.1.2-1.4.7-2.6 1.6-3.5M11.4 6.3c3.6-.6 6.9 1.7 7.3 5 2 .2 3.4 1.6 3.3 3.6-.1.9-.4 1.7-1 2.3M17 18.4H9.4" />
      <path d="M3.6 3.8 20.4 20.4" />
    </>
  ),
  cloudUp: (
    <>
      <path d="M7.1 18.4c-2.6 0-4-1.8-3.8-3.8.2-1.9 1.7-3.2 3.6-3.1.4-3.4 2.9-5.4 5.8-5.3 2.8.1 5 2.2 5.3 5 2 .2 3.4 1.6 3.3 3.6-.1 2-1.6 3.5-3.7 3.5" />
      <path d="M12.1 20 12 12.6M9.5 15l2.5-2.5 2.6 2.4" />
    </>
  ),
  cloudAlert: (
    <>
      <path d="M7.1 18.4c-2.6 0-4-1.8-3.8-3.8.2-1.9 1.7-3.2 3.6-3.1.4-3.4 2.9-5.4 5.8-5.3 2.8.1 5 2.2 5.3 5 2 .2 3.4 1.6 3.3 3.6-.1 2-1.6 3.5-3.7 3.5Z" />
      <path d="M12 10.3v3.6M12.1 16.3h.1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.6c4.7-.1 8.4 3.6 8.4 8.3s-3.7 8.5-8.4 8.5c-4.6 0-8.4-3.8-8.3-8.5.1-4.6 3.7-8.2 8.3-8.3Z" />
      <path d="M12 7.8 12.1 12.8M12.1 15.9h.1" />
    </>
  ),
  up: <path d="M12.1 19.4 11.9 5.2M6.4 10.6 12 5l5.6 5.7" />,
  down: <path d="M11.9 4.6 12.1 18.8M6.4 13.4 12 19l5.6-5.7" />,
};

export interface HandIconProps {
  name: HandIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-label"?: string;
}

export function HandIcon({ name, size = 22, strokeWidth = 2, className = "", "aria-label": label }: HandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {HAND_ICON_PATHS[name]}
    </svg>
  );
}
