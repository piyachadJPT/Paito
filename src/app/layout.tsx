import type { Metadata, Viewport } from "next";
import { ClockBoot } from "@/components/clock/ClockBoot";
import { AuthProvider } from "@/services/auth/AuthProvider";
import { SyncProvider } from "@/services/data/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ไปต่อ",
  applicationName: "ไปต่อ",
  description: "แผนเที่ยวส่วนตัว: อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง",
};

// Zoom stays enabled (no maximumScale / userScalable) — SPEC §10.1
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body>
        <ClockBoot />
        <AuthProvider>
          <SyncProvider>{children}</SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
