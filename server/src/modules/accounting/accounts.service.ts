import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { computeBalance, isAccountType } from "../../shared/accounting/accountTypes.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateAccountInput } from "./accounts.schemas.js";

export function listAccounts(companyId: string) {
  return prisma.account.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });
}

export async function createAccount(
  companyId: string,
  actorUserId: string,
  input: CreateAccountInput,
) {
  const existing = await prisma.account.findUnique({
    where: { companyId_code: { companyId, code: input.code } },
  });
  if (existing) {
    throw new ConflictError(`Ya existe una cuenta con el codigo ${input.code}.`);
  }

  if (input.parentId) {
    const parent = await prisma.account.findFirst({
      where: { id: input.parentId, companyId },
    });
    if (!parent) {
      throw new ValidationError("La cuenta padre indicada no existe.");
    }
  }

  const account = await prisma.account.create({
    data: {
      companyId,
      code: input.code,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
    },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "account.created",
    entityType: "Account",
    entityId: account.id,
    after: { code: account.code, name: account.name, type: account.type },
  });

  return account;
}

export async function getAccountWithBalance(companyId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new NotFoundError("Cuenta no encontrada.");
  }

  if (!isAccountType(account.type)) {
    throw new Error(`Tipo de cuenta invalido almacenado para la cuenta ${account.id}: ${account.type}`);
  }

  const totals = await prisma.journalLine.aggregate({
    where: { accountId, journalEntry: { status: "posted" } },
    _sum: { debit: true, credit: true },
  });

  const totalDebit = totals._sum.debit ?? 0;
  const totalCredit = totals._sum.credit ?? 0;
  const balance = computeBalance(account.type, totalDebit, totalCredit);

  return { account, totalDebit, totalCredit, balance };
}
