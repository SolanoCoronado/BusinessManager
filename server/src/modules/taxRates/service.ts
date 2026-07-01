import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateTaxRateInput } from "./schemas.js";

export function listTaxRates(companyId: string) {
  return prisma.taxRate.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function createTaxRate(
  companyId: string,
  actorUserId: string,
  input: CreateTaxRateInput,
) {
  const existing = await prisma.taxRate.findUnique({
    where: { companyId_name: { companyId, name: input.name } },
  });
  if (existing) {
    throw new ConflictError(`Ya existe un impuesto con el nombre ${input.name}.`);
  }

  if (input.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, companyId },
    });
    if (!account) {
      throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
    }
  }

  const taxRate = await prisma.taxRate.create({ data: { companyId, ...input } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "tax_rate.created",
    entityType: "TaxRate",
    entityId: taxRate.id,
    after: { name: taxRate.name, rate: taxRate.rate },
  });

  return taxRate;
}

export async function setTaxRateActive(
  companyId: string,
  actorUserId: string,
  taxRateId: string,
  active: boolean,
) {
  const existing = await prisma.taxRate.findFirst({ where: { id: taxRateId, companyId } });
  if (!existing) {
    throw new NotFoundError("Impuesto no encontrado.");
  }

  const updated = await prisma.taxRate.update({ where: { id: taxRateId }, data: { active } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: active ? "tax_rate.activated" : "tax_rate.deactivated",
    entityType: "TaxRate",
    entityId: taxRateId,
  });

  return updated;
}
