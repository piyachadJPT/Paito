import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ClockBoot } from "@/components/clock/ClockBoot";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { AuthProvider } from "@/services/auth/AuthProvider";
import { SyncProvider } from "@/services/data/SyncProvider";
import "./globals.css";

// Handwriting face for headings and stamps only (SPEC U10). Bundled, so it works offline.
const hand = localFont({
  src: [
    { path: "./fonts/Mali-Medium.ttf", weight: "500" },
    { path: "./fonts/Mali-SemiBold.ttf", weight: "600" },
    { path: "./fonts/Mali-Bold.ttf", weight: "700" },
  ],
  variable: "--font-mali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ไปต่อ",
  applicationName: "ไปต่อ",
  description: "แผนเที่ยวส่วนตัว: อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง",
  // iOS Home Screen app (SPEC §12); apple-icon.png and icon.svg come from app/
  appleWebApp: { capable: true, title: "ไปต่อ", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// Zoom stays enabled (no maximumScale / userScalable) — SPEC §10.1
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#efe7d6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={hand.variable}>
      <body>
        <ClockBoot />
        <ServiceWorker />
        <AuthProvider>
          <SyncProvider>{children}</SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
