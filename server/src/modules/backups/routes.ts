import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createBackup, listBackups, restoreBackup } from "./service.js";

export async function backupsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/backups",
    { preHandler: [authenticate, requirePermission("backups", "view")] },
    async () => {
      const backups = listBackups();
      return { backups };
    },
  );

  app.post(
    "/api/v1/backups",
    { preHandler: [authenticate, requirePermission("backups", "create")] },
    async (request, reply) => {
      const backup = await createBackup(request.authUser!.companyId, request.authUser!.sub);
      reply.code(201);
      return { backup };
    },
  );

  app.post(
    "/api/v1/backups/:filename/restore",
    { preHandler: [authenticate, requirePermission("backups", "edit")] },
    async (request) => {
      const { filename } = request.params as { filename: string };
      if (!filename) {
        throw new ValidationError("Falta el nombre del archivo de respaldo.");
      }
      const result = await restoreBackup(
        request.authUser!.companyId,
        request.authUser!.sub,
        filename,
      );
      return result;
    },
  );
}
