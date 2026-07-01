import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateBankAccountInput } from "./schemas.js";

export function listBankAccounts(companyId: string) {
  return prisma.bankAccount.findMany({
    where: { companyId },
    include: { account: true },
    orderBy: { name: "asc" },
  });
}

export async function createBankAccount(
  companyId: string,
  actorUserId: string,
  input: CreateBankAccountInput,
) {
  const account = await prisma.account.findFirst({ where: { id: input.accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
  }
  if (account.type !== "asset") {
    throw new ValidationError("La cuenta bancaria debe asociarse a una cuenta de tipo activo.");
  }

  const existing = await prisma.bankAccount.findUnique({
    where: { companyId_accountId: { companyId, accountId: input.accountId } },
  });
  if (existing) {
    throw new ConflictError("Esa cuenta contable ya esta asociada a otra cuenta bancaria.");
  }

  const bankAccount = await prisma.bankAccount.create({
    data: {
      companyId,
      name: input.name,
      accountId: input.accountId,
      currency: input.currency,
      openingBalance: input.openingBalance,
    },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "bank_account.created",
    entityType: "BankAccount",
    entityId: bankAccount.id,
    after: { name: bankAccount.name, accountId: bankAccount.accountId },
  });

  return bankAccount;
}

export async function getBankAccount(companyId: string, id: string) {
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id, companyId },
    include: { account: true },
  });
  if (!bankAccount) {
    throw new NotFoundError("Cuenta bancaria no encontrada.");
  }
  return bankAccount;
}
