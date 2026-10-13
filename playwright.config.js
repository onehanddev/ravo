import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  timeout: 45000,
  expect: { timeout: 7000 },
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4185", trace: "retain-on-failure", screenshot: "only-on-failure", ...devices["Desktop Chrome"] },
  webServer: { command: "npm run dev -- --port 4185 --strictPort", url: "http://127.0.0.1:4185", reuseExistingServer: false },
});
