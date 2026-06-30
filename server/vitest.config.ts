import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret-do-not-use-in-prod",
    },
    globalSetup: ["./tests/globalSetup.ts"],
    fileParallelism: false,
  },
});
