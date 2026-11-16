"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Navigation, Settings, type LucideIcon } from "lucide-react";

interface Tab {
  href: "/" | "/plan" | "/settings";
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { href: "/", label: "ตอนนี้", icon: Navigation },
  { href: "/plan", label: "แผนเที่ยว", icon: CalendarDays },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

function isActive(pathname: string, href: Tab["href"]) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating pill tab bar, sitting just above the iOS home indicator. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-md gap-1 rounded-[26px] border border-line bg-bar p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl backdrop-saturate-150">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] leading-none font-semibold ${
                  active ? "bg-primary-soft text-primary" : "text-ink-2 active:bg-card-sunken"
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={active ? 2.4 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
