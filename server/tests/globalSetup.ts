import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const serverRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const testDbPath = path.join(serverRoot, "prisma", "test.db");

export async function setup() {
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  execSync("npx prisma migrate deploy", {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}

export async function teardown() {
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }
}
