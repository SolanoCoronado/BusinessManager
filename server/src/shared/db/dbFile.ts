import path from "node:path";

// DATABASE_URL es relativo a la carpeta prisma/ (asi resuelve Prisma las rutas
// sqlite "file:..."), y el proceso siempre corre con cwd = server/.
export function getDbFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const relative = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path.resolve(process.cwd(), "prisma", relative);
}

export function getBackupsDir(): string {
  return path.resolve(process.cwd(), process.env.BACKUPS_DIR ?? "backups");
}
