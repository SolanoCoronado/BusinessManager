import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret-do-not-use-in-prod",
      BACKUPS_DIR: "backups-test",
    },
    globalSetup: ["./tests/globalSetup.ts"],
    fileParallelism: false,
  },
});
