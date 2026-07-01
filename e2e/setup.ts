import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const serverRoot = path.join(root, "server");
const dbPath = path.join(serverRoot, "prisma", "dev.db");
const backupsDir = path.join(serverRoot, "backups");

export default async function setup() {
  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }

  if (existsSync(backupsDir)) {
    for (const file of readdirSync(backupsDir).filter((f) => f.endsWith(".db"))) {
      rmSync(path.join(backupsDir, file));
    }
  }

  execSync("npx prisma migrate deploy", {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: "file:./dev.db" },
    stdio: "inherit",
  });
}
