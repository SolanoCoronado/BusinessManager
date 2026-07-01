import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { hashPassword } from "../../shared/auth/password.js";
import { ConflictError, NotFoundError } from "../../shared/errors/AppError.js";
import { seedDefaultChartOfAccounts } from "../accounting/defaultChartOfAccounts.js";
import type { OnboardingInput, UpdateCompanyInput } from "./schemas.js";

export async function onboardCompany(input: OnboardingInput) {
  const existingCompanies = await prisma.company.count();
  if (existingCompanies > 0) {
    throw new ConflictError("Ya existe una empresa configurada en esta instalacion.");
  }

  const passwordHash = await hashPassword(input.admin.password);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({ data: input.company });

    const admin = await tx.user.create({
      data: {
        companyId: company.id,
        email: input.admin.email.toLowerCase(),
        passwordHash,
        name: input.admin.name,
        role: "admin",
      },
    });

    await seedDefaultChartOfAccounts(tx, company.id);

    await recordAudit(tx, {
      companyId: company.id,
      userId: admin.id,
      action: "company.onboarded",
      entityType: "Company",
      entityId: company.id,
      after: { displayName: company.displayName, adminEmail: admin.email },
    });

    return { company, admin };
  });
}

export function getCurrentCompany() {
  return prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function updateCompany(
  companyId: string,
  actorUserId: string,
  input: UpdateCompanyInput,
) {
  const existing = await prisma.company.findUnique({ where: { id: companyId } });
  if (!existing) {
    throw new NotFoundError("Empresa no encontrada.");
  }

  const updated = await prisma.company.update({ where: { id: companyId }, data: input });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "company.updated",
    entityType: "Company",
    entityId: companyId,
    before: {
      baseCurrency: existing.baseCurrency,
      secondaryCurrency: existing.secondaryCurrency,
      locale: existing.locale,
    },
    after: {
      baseCurrency: updated.baseCurrency,
      secondaryCurrency: updated.secondaryCurrency,
      locale: updated.locale,
    },
  });

  return updated;
}
