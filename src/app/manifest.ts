import type { MetadataRoute } from "next";

/** Web app manifest (SPEC §12). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ไปต่อ",
    short_name: "ไปต่อ",
    description: "แผนเที่ยวส่วนตัว: อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง",
    lang: "th",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1ea",
    theme_color: "#f4f1ea",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
