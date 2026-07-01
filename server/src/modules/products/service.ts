import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateProductInput, UpdateProductInput } from "./schemas.js";

async function assertAccountBelongsToCompany(companyId: string, accountId?: string) {
  if (!accountId) return;
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
  }
}

async function assertTaxRateBelongsToCompany(companyId: string, taxRateId?: string) {
  if (!taxRateId) return;
  const taxRate = await prisma.taxRate.findFirst({ where: { id: taxRateId, companyId } });
  if (!taxRate) {
    throw new ValidationError("El impuesto indicado no existe en esta empresa.");
  }
}

export function listProducts(companyId: string) {
  return prisma.product.findMany({ where: { companyId }, orderBy: { name: "asc" } });
}

export async function createProduct(
  companyId: string,
  actorUserId: string,
  input: CreateProductInput,
) {
  const existing = await prisma.product.findUnique({
    where: { companyId_sku: { companyId, sku: input.sku } },
  });
  if (existing) {
    throw new ConflictError(`Ya existe un producto con el SKU ${input.sku}.`);
  }

  await assertAccountBelongsToCompany(companyId, input.incomeAccountId);
  await assertAccountBelongsToCompany(companyId, input.expenseAccountId);
  await assertTaxRateBelongsToCompany(companyId, input.taxRateId);

  const product = await prisma.product.create({ data: { companyId, ...input } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "product.created",
    entityType: "Product",
    entityId: product.id,
    after: { sku: product.sku, name: product.name },
  });

  return product;
}

export async function updateProduct(
  companyId: string,
  actorUserId: string,
  productId: string,
  input: UpdateProductInput,
) {
  const existing = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!existing) {
    throw new NotFoundError("Producto no encontrado.");
  }

  await assertAccountBelongsToCompany(companyId, input.incomeAccountId);
  await assertAccountBelongsToCompany(companyId, input.expenseAccountId);
  await assertTaxRateBelongsToCompany(companyId, input.taxRateId);

  const updated = await prisma.product.update({ where: { id: productId }, data: input });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "product.updated",
    entityType: "Product",
    entityId: productId,
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function setProductActive(
  companyId: string,
  actorUserId: string,
  productId: string,
  active: boolean,
) {
  const existing = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!existing) {
    throw new NotFoundError("Producto no encontrado.");
  }

  const updated = await prisma.product.update({ where: { id: productId }, data: { active } });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: active ? "product.activated" : "product.deactivated",
    entityType: "Product",
    entityId: productId,
  });

  return updated;
}
