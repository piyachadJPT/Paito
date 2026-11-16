"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HandIcon, type HandIconName } from "@/components/ui/icons";
import { useNowState } from "@/hooks/useNowState";

interface Tab {
  href: "/" | "/plan" | "/settings";
  label: string;
  icon: HandIconName;
}

const TABS: Tab[] = [
  { href: "/", label: "ตอนนี้", icon: "now" },
  { href: "/plan", label: "แผนเที่ยว", icon: "plan" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

function isActive(pathname: string, href: Tab["href"]) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating paper tab bar above the iOS home indicator; the active tab gets an ink underline. */
export function TabBar() {
  const pathname = usePathname();
  // Orange dot on "ตอนนี้" while an alert is waiting (SPEC §6, §10.2)
  const hasAlert = (useNowState().state?.alerts.length ?? 0) > 0;

  return (
    <nav
      aria-label="เมนูหลัก"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-md gap-1 rounded-[22px] border border-line bg-bar p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl backdrop-saturate-150">
        {TABS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[18px] text-[12px] leading-none font-semibold ${
                  active ? "text-primary" : "text-ink-2 active:bg-card-sunken"
                }`}
              >
                <span className="relative">
                  <HandIcon name={icon} size={22} strokeWidth={active ? 2.3 : 2} />
                  {href === "/" && hasAlert && (
                    <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-warning ring-2 ring-bar-solid" />
                  )}
                </span>
                <span>
                  {label}
                  {href === "/" && hasAlert && <span className="sr-only"> (มีการเตือน)</span>}
                </span>
                {/* ink underline under the active tab (text label carries the meaning too, via aria-current) */}
                <span aria-hidden className={`h-1 w-[22px] -rotate-2 rounded-full ${active ? "bg-primary" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
