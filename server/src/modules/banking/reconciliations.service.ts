import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { getBankAccount } from "./bankAccounts.service.js";
import type { StartReconciliationInput } from "./schemas.js";

export function listReconciliations(companyId: string, bankAccountId: string) {
  return prisma.reconciliation.findMany({
    where: { companyId, bankAccountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReconciliation(companyId: string, id: string) {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id, companyId },
    include: { transactions: true },
  });
  if (!reconciliation) {
    throw new NotFoundError("Conciliacion no encontrada.");
  }
  return reconciliation;
}

export async function startReconciliation(
  companyId: string,
  actorUserId: string,
  input: StartReconciliationInput,
) {
  await getBankAccount(companyId, input.bankAccountId);

  const inProgress = await prisma.reconciliation.findFirst({
    where: { companyId, bankAccountId: input.bankAccountId, status: "in_progress" },
  });
  if (inProgress) {
    throw new ConflictError("Ya hay una conciliacion en progreso para esta cuenta bancaria.");
  }

  const reconciliation = await prisma.reconciliation.create({
    data: {
      companyId,
      bankAccountId: input.bankAccountId,
      periodEnd: input.periodEnd,
      statementEndingBalance: input.statementEndingBalance,
      createdByUserId: actorUserId,
    },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "reconciliation.started",
    entityType: "Reconciliation",
    entityId: reconciliation.id,
    after: { bankAccountId: input.bankAccountId, statementEndingBalance: input.statementEndingBalance },
  });

  return reconciliation;
}

export async function setTransactionMatched(
  companyId: string,
  actorUserId: string,
  reconciliationId: string,
  transactionId: string,
  matched: boolean,
) {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: reconciliationId, companyId },
  });
  if (!reconciliation) {
    throw new NotFoundError("Conciliacion no encontrada.");
  }
  if (reconciliation.status !== "in_progress") {
    throw new ValidationError("Esta conciliacion ya fue completada.");
  }

  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, companyId, bankAccountId: reconciliation.bankAccountId },
  });
  if (!transaction) {
    throw new NotFoundError("Movimiento bancario no encontrado.");
  }

  const updated = await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: matched
      ? { status: "matched", reconciliationId }
      : { status: "pending", reconciliationId: null },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: matched ? "bank_transaction.matched" : "bank_transaction.unmatched",
    entityType: "BankTransaction",
    entityId: transactionId,
    after: { reconciliationId: matched ? reconciliationId : null },
  });

  return updated;
}

export async function completeReconciliation(
  companyId: string,
  actorUserId: string,
  reconciliationId: string,
) {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: reconciliationId, companyId },
    include: { bankAccount: true },
  });
  if (!reconciliation) {
    throw new NotFoundError("Conciliacion no encontrada.");
  }
  if (reconciliation.status !== "in_progress") {
    throw new ConflictError("Esta conciliacion ya fue completada.");
  }

  const totals = await prisma.journalLine.aggregate({
    where: {
      accountId: reconciliation.bankAccount.accountId,
      journalEntry: { status: "posted" },
    },
    _sum: { debit: true, credit: true },
  });
  const bookBalance = (totals._sum.debit ?? 0) - (totals._sum.credit ?? 0);
  const difference = reconciliation.statementEndingBalance - bookBalance;

  return prisma.$transaction(async (tx) => {
    await tx.bankTransaction.updateMany({
      where: { reconciliationId, status: "matched" },
      data: { status: "reconciled" },
    });

    const updated = await tx.reconciliation.update({
      where: { id: reconciliationId },
      data: { status: "completed", bookBalance, difference, completedAt: new Date() },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "reconciliation.completed",
      entityType: "Reconciliation",
      entityId: reconciliationId,
      after: { bookBalance, difference },
    });

    return updated;
  });
}
