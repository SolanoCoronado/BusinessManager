import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const serverRoot = path.join(root, "server");
const dbPath = path.join(serverRoot, "prisma", "dev.db");

export default async function teardown() {
  if (existsSync(dbPath)) {
    try {
      rmSync(dbPath);
    } catch {
      // El servidor aun puede tener el archivo abierto en Windows (EPERM).
      // No es un error critico: el proximo setup lo eliminara antes de correr
      // las migraciones. Se registra como informacion, no como fallo.
      console.log("[teardown] No se pudo eliminar dev.db (archivo en uso). Se limpiara en el proximo run.");
    }
  }
}
