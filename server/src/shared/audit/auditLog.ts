import type { Prisma, PrismaClient } from "@prisma/client";

type RecordAuditInput = {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export function recordAudit(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: RecordAuditInput,
) {
  return prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  });
}
