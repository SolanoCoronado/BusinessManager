import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { listAuditLogs } from "./service.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/audit-logs",
    { preHandler: [authenticate, requirePermission("audit", "view")] },
    async (request) => {
      const { limit } = request.query as { limit?: string };
      const logs = await listAuditLogs(
        request.authUser!.companyId,
        limit ? Number(limit) : undefined,
      );
      return { logs };
    },
  );
}
