import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import {
  getAccountByCode,
  resolveVendorPayableAccount,
  FALLBACK_EXPENSE_ACCOUNT_CODE,
} from "../../shared/accounting/resolveAccounts.js";
import { validateBalancedJournalEntry } from "../../shared/accounting/journalValidation.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { reverseJournalEntryWithClient } from "../accounting/journalEntries.service.js";
import type { CreateBillInput } from "./schemas.js";

async function nextBillNumber(companyId: string) {
  const count = await prisma.bill.count({ where: { companyId } });
  return `CXP-${String(count + 1).padStart(4, "0")}`;
}

export function listBills(companyId: string) {
  return prisma.bill.findMany({
    where: { companyId },
    include: { lines: true, vendor: true },
    orderBy: { issueDate: "desc" },
  });
}

export async function getBill(companyId: string, id: string) {
  const bill = await prisma.bill.findFirst({
    where: { id, companyId },
    include: { lines: true, vendor: true, payments: true },
  });
  if (!bill) {
    throw new NotFoundError("Cuenta por pagar no encontrada.");
  }
  return bill;
}

export async function createBill(companyId: string, actorUserId: string, input: CreateBillInput) {
  const vendor = await prisma.vendor.findFirst({ where: { id: input.vendorId, companyId } });
  if (!vendor) {
    throw new ValidationError("El proveedor indicado no existe en esta empresa.");
  }

  const accountIds = [
    ...new Set(input.lines.map((l) => l.accountId).filter((v): v is string => Boolean(v))),
  ];
  if (accountIds.length) {
    const accounts = await prisma.account.findMany({ where: { id: { in: accountIds }, companyId } });
    if (accounts.length !== accountIds.length) {
      throw new ValidationError("Una o mas cuentas indicadas no existen en esta empresa.");
    }
  }

  const productIds = [
    ...new Set(input.lines.map((l) => l.productId).filter((v): v is string => Boolean(v))),
  ];
  if (productIds.length) {
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId } });
    if (products.length !== productIds.length) {
      throw new ValidationError("Uno o mas productos indicados no existen en esta empresa.");
    }
  }

  const computedLines = input.lines.map((line) => ({
    ...line,
    lineTotal: Math.round(line.quantity * line.unitPrice),
  }));
  const total = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const number = await nextBillNumber(companyId);

  const bill = await prisma.bill.create({
    data: {
      companyId,
      vendorId: vendor.id,
      number,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      memo: input.memo,
      total,
      balanceDue: total,
      createdByUserId: actorUserId,
      lines: {
        create: computedLines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          accountId: line.accountId,
          lineTotal: line.lineTotal,
        })),
      },
    },
    include: { lines: true },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "bill.created",
    entityType: "Bill",
    entityId: bill.id,
    after: { number: bill.number, total: bill.total },
  });

  return bill;
}

export async function confirmBill(companyId: string, actorUserId: string, billId: string) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, companyId },
    include: { lines: true, vendor: true },
  });
  if (!bill) {
    throw new NotFoundError("Cuenta por pagar no encontrada.");
  }
  if (bill.status !== "draft") {
    throw new ValidationError("Solo se pueden confirmar cuentas por pagar en borrador.");
  }

  const apAccountResolved = await resolveVendorPayableAccount(companyId, bill.vendor);
  const fallbackExpense = await getAccountByCode(companyId, FALLBACK_EXPENSE_ACCOUNT_CODE);

  const expenseDebits = new Map<string, number>();
  for (const line of bill.lines) {
    const accountId = line.accountId ?? fallbackExpense.id;
    expenseDebits.set(accountId, (expenseDebits.get(accountId) ?? 0) + line.lineTotal);
  }

  const journalLines = [
    ...[...expenseDebits.entries()].map(([accountId, amount]) => ({
      accountId,
      debit: amount,
      credit: 0,
    })),
    { accountId: apAccountResolved.id, debit: 0, credit: bill.total },
  ];

  const sanityCheck = validateBalancedJournalEntry(journalLines);
  if (!sanityCheck.valid) {
    throw new Error(`Asiento de cuenta por pagar desbalanceado (${bill.id}): ${sanityCheck.reason}`);
  }

  return prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        date: bill.issueDate,
        memo: `Cuenta por pagar ${bill.number}`,
        status: "posted",
        sourceType: "bill",
        sourceId: bill.id,
        createdByUserId: actorUserId,
        lines: { create: journalLines },
      },
    });

    const updated = await tx.bill.update({
      where: { id: bill.id },
      data: { status: "confirmed", journalEntryId: journalEntry.id },
      include: { lines: true },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "bill.confirmed",
      entityType: "Bill",
      entityId: bill.id,
      after: { journalEntryId: journalEntry.id, total: bill.total },
    });

    return updated;
  });
}

export async function voidBill(companyId: string, actorUserId: string, billId: string) {
  const bill = await prisma.bill.findFirst({ where: { id: billId, companyId } });
  if (!bill) {
    throw new NotFoundError("Cuenta por pagar no encontrada.");
  }
  if (bill.status === "void") {
    throw new ConflictError("Esta cuenta por pagar ya esta anulada.");
  }
  if (bill.status === "partially_paid" || bill.status === "paid") {
    throw new ValidationError("No se puede anular una cuenta por pagar con pagos aplicados.");
  }

  return prisma.$transaction(async (tx) => {
    if (bill.status === "confirmed" && bill.journalEntryId) {
      await reverseJournalEntryWithClient(tx, companyId, actorUserId, bill.journalEntryId);
    }

    const updated = await tx.bill.update({
      where: { id: bill.id },
      data: { status: "void", balanceDue: 0 },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "bill.voided",
      entityType: "Bill",
      entityId: bill.id,
    });

    return updated;
  });
}
