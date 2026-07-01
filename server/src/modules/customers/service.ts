import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateCustomerInput, UpdateCustomerInput } from "./schemas.js";

async function assertAccountBelongsToCompany(companyId: string, accountId?: string) {
  if (!accountId) return;
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
  }
}

export function listCustomers(companyId: string) {
  return prisma.customer.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function createCustomer(
  companyId: string,
  actorUserId: string,
  input: CreateCustomerInput,
) {
  await assertAccountBelongsToCompany(companyId, input.defaultAccountId);

  const customer = await prisma.customer.create({
    data: { companyId, ...input, email: input.email || undefined },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "customer.created",
    entityType: "Customer",
    entityId: customer.id,
    after: { name: customer.name },
  });

  return customer;
}

export async function updateCustomer(
  companyId: string,
  actorUserId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  const existing = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!existing) {
    throw new NotFoundError("Cliente no encontrado.");
  }

  await assertAccountBelongsToCompany(companyId, input.defaultAccountId);

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { ...input, email: input.email || undefined },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "customer.updated",
    entityType: "Customer",
    entityId: customerId,
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function setCustomerActive(
  companyId: string,
  actorUserId: string,
  customerId: string,
  active: boolean,
) {
  const existing = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
  if (!existing) {
    throw new NotFoundError("Cliente no encontrado.");
  }

  const updated = await prisma.customer.update({ where: { id: customerId }, data: { active } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: active ? "customer.activated" : "customer.deactivated",
    entityType: "Customer",
    entityId: customerId,
  });

  return updated;
}
