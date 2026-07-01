import { prisma } from "../../db/client.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export function listAuditLogs(companyId: string, limit?: number) {
  const take = Math.min(limit && limit > 0 ? limit : DEFAULT_LIMIT, MAX_LIMIT);

  return prisma.auditLog.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
