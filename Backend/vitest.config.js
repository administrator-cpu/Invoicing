import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    globals: true,
    environment: "node",
    setupFiles: "./src/setup.js",
    testTimeout: 30000,
    hookTimeout: 30000
  }
});