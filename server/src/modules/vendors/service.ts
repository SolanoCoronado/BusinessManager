import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateVendorInput, UpdateVendorInput } from "./schemas.js";

async function assertAccountBelongsToCompany(companyId: string, accountId?: string) {
  if (!accountId) return;
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
  }
}

export function listVendors(companyId: string) {
  return prisma.vendor.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function createVendor(companyId: string, actorUserId: string, input: CreateVendorInput) {
  await assertAccountBelongsToCompany(companyId, input.defaultAccountId);

  const vendor = await prisma.vendor.create({
    data: { companyId, ...input, email: input.email || undefined },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "vendor.created",
    entityType: "Vendor",
    entityId: vendor.id,
    after: { name: vendor.name },
  });

  return vendor;
}

export async function updateVendor(
  companyId: string,
  actorUserId: string,
  vendorId: string,
  input: UpdateVendorInput,
) {
  const existing = await prisma.vendor.findFirst({ where: { id: vendorId, companyId } });
  if (!existing) {
    throw new NotFoundError("Proveedor no encontrado.");
  }

  await assertAccountBelongsToCompany(companyId, input.defaultAccountId);

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { ...input, email: input.email || undefined },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "vendor.updated",
    entityType: "Vendor",
    entityId: vendorId,
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function setVendorActive(
  companyId: string,
  actorUserId: string,
  vendorId: string,
  active: boolean,
) {
  const existing = await prisma.vendor.findFirst({ where: { id: vendorId, companyId } });
  if (!existing) {
    throw new NotFoundError("Proveedor no encontrado.");
  }

  const updated = await prisma.vendor.update({ where: { id: vendorId }, data: { active } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: active ? "vendor.activated" : "vendor.deactivated",
    entityType: "Vendor",
    entityId: vendorId,
  });

  return updated;
}
