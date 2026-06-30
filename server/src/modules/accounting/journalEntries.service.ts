import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { validateBalancedJournalEntry } from "../../shared/accounting/journalValidation.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import type { CreateJournalEntryInput } from "./journalEntries.schemas.js";

export function listJournalEntries(companyId: string) {
  return prisma.journalEntry.findMany({
    where: { companyId },
    include: { lines: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function getJournalEntry(companyId: string, id: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId },
    include: { lines: true, reversedBy: true, reversalOf: true },
  });
  if (!entry) {
    throw new NotFoundError("Asiento no encontrado.");
  }
  return entry;
}

async function assertAccountsBelongToCompany(companyId: string, accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  const accounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds }, companyId },
  });

  if (accounts.length !== uniqueIds.length) {
    throw new ValidationError("Una o mas cuentas indicadas no existen en esta empresa.");
  }
}

export async function createJournalEntry(
  companyId: string,
  actorUserId: string,
  input: CreateJournalEntryInput,
) {
  const validation = validateBalancedJournalEntry(input.lines);
  if (!validation.valid) {
    throw new ValidationError(validation.reason);
  }

  await assertAccountsBelongToCompany(
    companyId,
    input.lines.map((line) => line.accountId),
  );

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.journalEntry.create({
      data: {
        companyId,
        date: input.date,
        memo: input.memo,
        status: "posted",
        sourceType: "manual",
        createdByUserId: actorUserId,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
          })),
        },
      },
      include: { lines: true },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "journal_entry.created",
      entityType: "JournalEntry",
      entityId: created.id,
      after: { totalDebit: validation.totalDebit, totalCredit: validation.totalCredit },
    });

    return created;
  });

  return entry;
}

export async function reverseJournalEntry(companyId: string, actorUserId: string, entryId: string) {
  const original = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    include: { lines: true },
  });

  if (!original) {
    throw new NotFoundError("Asiento no encontrado.");
  }

  if (original.status !== "posted") {
    throw new ValidationError("Solo se pueden revertir asientos confirmados.");
  }

  const alreadyReversed = await prisma.journalEntry.findFirst({
    where: { reversalOfId: original.id },
  });
  if (alreadyReversed) {
    throw new ConflictError("Este asiento ya fue revertido.");
  }

  const reversal = await prisma.$transaction(async (tx) => {
    const created = await tx.journalEntry.create({
      data: {
        companyId,
        date: new Date(),
        memo: original.memo
          ? `Reverso de: ${original.memo}`
          : `Reverso del asiento ${original.id}`,
        status: "posted",
        sourceType: "reversal",
        sourceId: original.id,
        reversalOfId: original.id,
        createdByUserId: actorUserId,
        lines: {
          create: original.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.credit,
            credit: line.debit,
            memo: line.memo,
          })),
        },
      },
      include: { lines: true },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "journal_entry.reversed",
      entityType: "JournalEntry",
      entityId: created.id,
      before: { reversalOfId: original.id },
    });

    return created;
  });

  return reversal;
}
