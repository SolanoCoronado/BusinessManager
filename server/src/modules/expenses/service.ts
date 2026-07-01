import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { reverseJournalEntryWithClient } from "../accounting/journalEntries.service.js";
import type { CreateExpenseInput } from "./schemas.js";

export function listExpenses(companyId: string) {
  return prisma.expense.findMany({ where: { companyId }, orderBy: { date: "desc" } });
}

async function assertAccountBelongsToCompany(companyId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta contable indicada no existe en esta empresa.");
  }
}

export async function createExpense(
  companyId: string,
  actorUserId: string,
  input: CreateExpenseInput,
) {
  await assertAccountBelongsToCompany(companyId, input.accountId);
  await assertAccountBelongsToCompany(companyId, input.paidFromAccountId);

  if (input.vendorId) {
    const vendor = await prisma.vendor.findFirst({ where: { id: input.vendorId, companyId } });
    if (!vendor) {
      throw new ValidationError("El proveedor indicado no existe en esta empresa.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        date: input.date,
        memo: input.memo ?? "Gasto pagado",
        status: "posted",
        sourceType: "expense",
        createdByUserId: actorUserId,
        lines: {
          create: [
            { accountId: input.accountId, debit: input.amount, credit: 0 },
            { accountId: input.paidFromAccountId, debit: 0, credit: input.amount },
          ],
        },
      },
    });

    const expense = await tx.expense.create({
      data: {
        companyId,
        vendorId: input.vendorId,
        accountId: input.accountId,
        paidFromAccountId: input.paidFromAccountId,
        amount: input.amount,
        date: input.date,
        memo: input.memo,
        journalEntryId: journalEntry.id,
        createdByUserId: actorUserId,
      },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "expense.created",
      entityType: "Expense",
      entityId: expense.id,
      after: { amount: expense.amount },
    });

    return expense;
  });
}

export async function voidExpense(companyId: string, actorUserId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, companyId } });
  if (!expense) {
    throw new NotFoundError("Gasto no encontrado.");
  }
  if (expense.status === "void") {
    throw new ConflictError("Este gasto ya esta anulado.");
  }

  return prisma.$transaction(async (tx) => {
    if (expense.journalEntryId) {
      await reverseJournalEntryWithClient(tx, companyId, actorUserId, expense.journalEntryId);
    }

    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: { status: "void" },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "expense.voided",
      entityType: "Expense",
      entityId: expense.id,
    });

    return updated;
  });
}
