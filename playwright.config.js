import { defineConfig } from "@playwright/test";

const useLocalServer = process.env.E2E_USE_LOCAL_SERVER !== "false";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: useLocalServer
    ? {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        url: "http://127.0.0.1:4173",
      }
    : undefined,
});
