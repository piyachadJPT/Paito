import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run tests in a timezone that is neither UTC nor the trip's, so any code that
// accidentally relies on the machine timezone fails loudly.
process.env.TZ = "America/New_York";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/hooks/**"],
      exclude: ["**/*.test.*"],
    },
  },
});
