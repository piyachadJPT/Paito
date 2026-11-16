import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/** Short build label for the developer panel, e.g. "a1b2c3d · 16 พ.ย. 23:40". */
function buildVersion(): string {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      sha = "local";
    }
  }
  return `${sha} · ${new Date().toISOString()}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: buildVersion(),
  },
  async headers() {
    return [
      {
        // The service worker must never be cached by the browser or a CDN
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
