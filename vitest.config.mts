import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The PGlite-backed database suites boot a full Postgres in WASM.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
