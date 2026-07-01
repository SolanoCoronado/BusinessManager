import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import {
  getAccountByCode,
  resolveCustomerReceivableAccount,
  FALLBACK_INCOME_ACCOUNT_CODE,
  FALLBACK_TAX_ACCOUNT_CODE,
} from "../../shared/accounting/resolveAccounts.js";
import { validateBalancedJournalEntry } from "../../shared/accounting/journalValidation.js";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors/AppError.js";
import { reverseJournalEntryWithClient } from "../accounting/journalEntries.service.js";
import type { CreateInvoiceInput } from "./schemas.js";

async function nextInvoiceNumber(companyId: string) {
  const count = await prisma.invoice.count({ where: { companyId } });
  return `FA-${String(count + 1).padStart(4, "0")}`;
}

export function listInvoices(companyId: string) {
  return prisma.invoice.findMany({
    where: { companyId },
    include: { lines: true, customer: true },
    orderBy: { issueDate: "desc" },
  });
}

export async function getInvoice(companyId: string, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { lines: true, customer: true, payments: true },
  });
  if (!invoice) {
    throw new NotFoundError("Factura no encontrada.");
  }
  return invoice;
}

export async function createInvoice(
  companyId: string,
  actorUserId: string,
  input: CreateInvoiceInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, companyId },
  });
  if (!customer) {
    throw new ValidationError("El cliente indicado no existe en esta empresa.");
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

  const taxRateIds = [
    ...new Set(input.lines.map((l) => l.taxRateId).filter((v): v is string => Boolean(v))),
  ];
  const taxRates = taxRateIds.length
    ? await prisma.taxRate.findMany({ where: { id: { in: taxRateIds }, companyId } })
    : [];
  if (taxRates.length !== taxRateIds.length) {
    throw new ValidationError("Uno o mas impuestos indicados no existen en esta empresa.");
  }
  const taxRateById = new Map(taxRates.map((t) => [t.id, t]));

  const computedLines = input.lines.map((line) => {
    const lineTotal = Math.round(line.quantity * line.unitPrice);
    const taxRate = line.taxRateId ? taxRateById.get(line.taxRateId) : undefined;
    const taxAmount = taxRate ? Math.round(lineTotal * (taxRate.rate / 100)) : 0;
    return { ...line, lineTotal, taxAmount };
  });

  const subtotal = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const taxTotal = computedLines.reduce((sum, l) => sum + l.taxAmount, 0);
  const total = subtotal + taxTotal;
  const number = await nextInvoiceNumber(companyId);

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      customerId: customer.id,
      number,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      memo: input.memo,
      subtotal,
      taxTotal,
      total,
      balanceDue: total,
      createdByUserId: actorUserId,
      lines: {
        create: computedLines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRateId: line.taxRateId,
          lineTotal: line.lineTotal,
          taxAmount: line.taxAmount,
        })),
      },
    },
    include: { lines: true },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "invoice.created",
    entityType: "Invoice",
    entityId: invoice.id,
    after: { number: invoice.number, total: invoice.total },
  });

  return invoice;
}

export async function confirmInvoice(companyId: string, actorUserId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lines: { include: { product: true, taxRate: true } }, customer: true },
  });
  if (!invoice) {
    throw new NotFoundError("Factura no encontrada.");
  }
  if (invoice.status !== "draft") {
    throw new ValidationError("Solo se pueden confirmar facturas en borrador.");
  }

  const arAccountResolved = await resolveCustomerReceivableAccount(companyId, invoice.customer);
  const fallbackIncome = await getAccountByCode(companyId, FALLBACK_INCOME_ACCOUNT_CODE);
  const fallbackTax =
    invoice.taxTotal > 0 ? await getAccountByCode(companyId, FALLBACK_TAX_ACCOUNT_CODE) : null;

  const incomeCredits = new Map<string, number>();
  const taxCredits = new Map<string, number>();

  for (const line of invoice.lines) {
    const incomeAccountId = line.product?.incomeAccountId ?? fallbackIncome.id;
    incomeCredits.set(incomeAccountId, (incomeCredits.get(incomeAccountId) ?? 0) + line.lineTotal);

    if (line.taxAmount > 0) {
      const taxAccountId = line.taxRate?.accountId ?? fallbackTax!.id;
      taxCredits.set(taxAccountId, (taxCredits.get(taxAccountId) ?? 0) + line.taxAmount);
    }
  }

  const journalLines = [
    { accountId: arAccountResolved.id, debit: invoice.total, credit: 0 },
    ...[...incomeCredits.entries()].map(([accountId, amount]) => ({
      accountId,
      debit: 0,
      credit: amount,
    })),
    ...[...taxCredits.entries()].map(([accountId, amount]) => ({
      accountId,
      debit: 0,
      credit: amount,
    })),
  ];

  const sanityCheck = validateBalancedJournalEntry(journalLines);
  if (!sanityCheck.valid) {
    throw new Error(`Asiento de factura desbalanceado (${invoice.id}): ${sanityCheck.reason}`);
  }

  return prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        date: invoice.issueDate,
        memo: `Factura ${invoice.number}`,
        status: "posted",
        sourceType: "invoice",
        sourceId: invoice.id,
        createdByUserId: actorUserId,
        lines: { create: journalLines },
      },
    });

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "confirmed", journalEntryId: journalEntry.id },
      include: { lines: true },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "invoice.confirmed",
      entityType: "Invoice",
      entityId: invoice.id,
      after: { journalEntryId: journalEntry.id, total: invoice.total },
    });

    return updated;
  });
}

export async function voidInvoice(companyId: string, actorUserId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) {
    throw new NotFoundError("Factura no encontrada.");
  }
  if (invoice.status === "void") {
    throw new ConflictError("Esta factura ya esta anulada.");
  }
  if (invoice.status === "partially_paid" || invoice.status === "paid") {
    throw new ValidationError("No se puede anular una factura con pagos aplicados.");
  }

  return prisma.$transaction(async (tx) => {
    if (invoice.status === "confirmed" && invoice.journalEntryId) {
      await reverseJournalEntryWithClient(tx, companyId, actorUserId, invoice.journalEntryId);
    }

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "void", balanceDue: 0 },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "invoice.voided",
      entityType: "Invoice",
      entityId: invoice.id,
    });

    return updated;
  });
}
