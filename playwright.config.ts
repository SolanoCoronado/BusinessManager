import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5310",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/setup.ts",
  globalTeardown: "./e2e/teardown.ts",
  webServer: {
    command: "npm run dev:all",
    url: "http://localhost:4310/api/v1/health",
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
