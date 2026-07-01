import { randomUUID } from "node:crypto";

import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { getBankAccount } from "./bankAccounts.service.js";
import type { CreateTransactionInput, ImportTransactionsInput } from "./schemas.js";

export function listBankTransactions(companyId: string, bankAccountId: string, status?: string) {
  return prisma.bankTransaction.findMany({
    where: { companyId, bankAccountId, ...(status ? { status } : {}) },
    orderBy: { date: "desc" },
  });
}

export async function createManualTransaction(
  companyId: string,
  actorUserId: string,
  bankAccountId: string,
  input: CreateTransactionInput,
) {
  await getBankAccount(companyId, bankAccountId);

  const transaction = await prisma.bankTransaction.create({
    data: {
      companyId,
      bankAccountId,
      date: input.date,
      description: input.description,
      amount: input.amount,
      createdByUserId: actorUserId,
    },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "bank_transaction.created",
    entityType: "BankTransaction",
    entityId: transaction.id,
    after: { amount: transaction.amount },
  });

  return transaction;
}

export async function importTransactions(
  companyId: string,
  actorUserId: string,
  bankAccountId: string,
  input: ImportTransactionsInput,
) {
  await getBankAccount(companyId, bankAccountId);

  const existing = await prisma.bankTransaction.findMany({
    where: { companyId, bankAccountId },
    select: { date: true, description: true, amount: true },
  });
  const existingKeys = new Set(
    existing.map((t) => `${t.date.toISOString().slice(0, 10)}|${t.description}|${t.amount}`),
  );

  const importBatchId = randomUUID();
  let imported = 0;
  let skippedDuplicates = 0;

  for (const row of input.rows) {
    const key = `${row.date.toISOString().slice(0, 10)}|${row.description}|${row.amount}`;
    if (existingKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    existingKeys.add(key);

    await prisma.bankTransaction.create({
      data: {
        companyId,
        bankAccountId,
        date: row.date,
        description: row.description,
        amount: row.amount,
        importBatchId,
        createdByUserId: actorUserId,
      },
    });
    imported += 1;
  }

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "bank_transaction.imported",
    entityType: "BankAccount",
    entityId: bankAccountId,
    after: { imported, skippedDuplicates, importBatchId },
  });

  return { imported, skippedDuplicates, importBatchId };
}

export async function setTransactionIgnored(
  companyId: string,
  actorUserId: string,
  transactionId: string,
  ignored: boolean,
) {
  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, companyId },
  });
  if (!transaction) {
    throw new NotFoundError("Movimiento bancario no encontrado.");
  }
  if (transaction.status === "reconciled") {
    throw new ValidationError("No se puede modificar un movimiento ya conciliado.");
  }

  const updated = await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: { status: ignored ? "ignored" : "pending" },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: ignored ? "bank_transaction.ignored" : "bank_transaction.unignored",
    entityType: "BankTransaction",
    entityId: transactionId,
  });

  return updated;
}
