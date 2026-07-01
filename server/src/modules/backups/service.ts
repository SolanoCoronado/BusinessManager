import fs from "node:fs";
import path from "node:path";

import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { getBackupsDir, getDbFilePath } from "../../shared/db/dbFile.js";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError.js";

const BACKUP_FILENAME_PATTERN = /^(backup|pre-restore)-\d{8}T\d{6}\.db$/;

function timestampForFilename(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
}

function ensureBackupsDir() {
  fs.mkdirSync(getBackupsDir(), { recursive: true });
}

export function listBackups() {
  ensureBackupsDir();
  const dir = getBackupsDir();

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".db"))
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return { filename: name, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createBackup(companyId: string, actorUserId: string) {
  ensureBackupsDir();
  const dbPath = getDbFilePath();
  if (!fs.existsSync(dbPath)) {
    throw new ValidationError("No se encontro el archivo de base de datos para respaldar.");
  }

  const filename = `backup-${timestampForFilename()}.db`;
  const destination = path.join(getBackupsDir(), filename);
  fs.copyFileSync(dbPath, destination);
  const stat = fs.statSync(destination);

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "backup.created",
    entityType: "Backup",
    entityId: filename,
    after: { filename, sizeBytes: stat.size },
  });

  return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
}

export async function restoreBackup(companyId: string, actorUserId: string, filename: string) {
  if (!BACKUP_FILENAME_PATTERN.test(filename)) {
    throw new ValidationError("Nombre de archivo de respaldo invalido.");
  }

  ensureBackupsDir();
  const backupPath = path.join(getBackupsDir(), filename);
  if (!fs.existsSync(backupPath)) {
    throw new NotFoundError("Respaldo no encontrado.");
  }

  const dbPath = getDbFilePath();

  // Copia de seguridad del estado actual antes de sobreescribir: si la
  // restauracion fue un error, el operador puede volver a restaurar este archivo.
  const preRestoreFilename = `pre-restore-${timestampForFilename()}.db`;
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, path.join(getBackupsDir(), preRestoreFilename));
  }

  // Este registro vive en la base de datos ACTUAL, que esta a punto de ser
  // reemplazada por el respaldo restaurado. Es intencional: restaurar significa
  // volver al estado exacto del respaldo, auditoria incluida. Por eso tambien
  // queda constancia en el log del servidor, que sí sobrevive a la operacion.
  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "backup.restored",
    entityType: "Backup",
    entityId: filename,
    before: { preRestoreSnapshot: preRestoreFilename },
  });
  console.log(
    `[backups] Restaurando "${filename}" (usuario ${actorUserId}). Copia previa: "${preRestoreFilename}".`,
  );

  await prisma.$disconnect();
  fs.copyFileSync(backupPath, dbPath);
  // Prisma reconecta automaticamente en la siguiente consulta.

  return { restoredFrom: filename, preRestoreSnapshot: preRestoreFilename };
}
