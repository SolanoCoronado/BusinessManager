import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import {
  resolveCustomerReceivableAccount,
  resolveVendorPayableAccount,
} from "../../shared/accounting/resolveAccounts.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import type { CreatePaymentInput } from "./schemas.js";

export function listPayments(companyId: string) {
  return prisma.payment.findMany({ where: { companyId }, orderBy: { date: "desc" } });
}

async function assertAccountBelongsToCompany(companyId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) {
    throw new ValidationError("La cuenta de banco/caja indicada no existe en esta empresa.");
  }
}

export async function createCustomerPayment(
  companyId: string,
  actorUserId: string,
  input: CreatePaymentInput,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, companyId },
    include: { customer: true },
  });
  if (!invoice) {
    throw new ValidationError("La factura indicada no existe en esta empresa.");
  }
  if (invoice.status !== "confirmed" && invoice.status !== "partially_paid") {
    throw new ValidationError("Solo se pueden registrar pagos sobre facturas confirmadas.");
  }
  if (input.amount > invoice.balanceDue) {
    throw new ValidationError("El monto del pago no puede exceder el saldo pendiente de la factura.");
  }

  await assertAccountBelongsToCompany(companyId, input.accountId);
  const arAccount = await resolveCustomerReceivableAccount(companyId, invoice.customer);

  return prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        date: input.date,
        memo: `Cobro factura ${invoice.number}`,
        status: "posted",
        sourceType: "payment",
        createdByUserId: actorUserId,
        lines: {
          create: [
            { accountId: input.accountId, debit: input.amount, credit: 0 },
            { accountId: arAccount.id, debit: 0, credit: input.amount },
          ],
        },
      },
    });

    const payment = await tx.payment.create({
      data: {
        companyId,
        type: "customer",
        invoiceId: invoice.id,
        amount: input.amount,
        date: input.date,
        method: input.method,
        accountId: input.accountId,
        memo: input.memo,
        journalEntryId: journalEntry.id,
        createdByUserId: actorUserId,
      },
    });

    const newBalance = invoice.balanceDue - input.amount;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : "partially_paid",
      },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "payment.customer_recorded",
      entityType: "Payment",
      entityId: payment.id,
      after: { invoiceId: invoice.id, amount: input.amount, remaining: newBalance },
    });

    return payment;
  });
}

export async function createVendorPayment(
  companyId: string,
  actorUserId: string,
  input: CreatePaymentInput,
) {
  const bill = await prisma.bill.findFirst({
    where: { id: input.billId, companyId },
    include: { vendor: true },
  });
  if (!bill) {
    throw new ValidationError("La cuenta por pagar indicada no existe en esta empresa.");
  }
  if (bill.status !== "confirmed" && bill.status !== "partially_paid") {
    throw new ValidationError("Solo se pueden registrar pagos sobre cuentas por pagar confirmadas.");
  }
  if (input.amount > bill.balanceDue) {
    throw new ValidationError("El monto del pago no puede exceder el saldo pendiente.");
  }

  await assertAccountBelongsToCompany(companyId, input.accountId);
  const apAccount = await resolveVendorPayableAccount(companyId, bill.vendor);

  return prisma.$transaction(async (tx) => {
    const journalEntry = await tx.journalEntry.create({
      data: {
        companyId,
        date: input.date,
        memo: `Pago cuenta por pagar ${bill.number}`,
        status: "posted",
        sourceType: "payment",
        createdByUserId: actorUserId,
        lines: {
          create: [
            { accountId: apAccount.id, debit: input.amount, credit: 0 },
            { accountId: input.accountId, debit: 0, credit: input.amount },
          ],
        },
      },
    });

    const payment = await tx.payment.create({
      data: {
        companyId,
        type: "vendor",
        billId: bill.id,
        amount: input.amount,
        date: input.date,
        method: input.method,
        accountId: input.accountId,
        memo: input.memo,
        journalEntryId: journalEntry.id,
        createdByUserId: actorUserId,
      },
    });

    const newBalance = bill.balanceDue - input.amount;
    await tx.bill.update({
      where: { id: bill.id },
      data: {
        balanceDue: newBalance,
        status: newBalance === 0 ? "paid" : "partially_paid",
      },
    });

    await recordAudit(tx, {
      companyId,
      userId: actorUserId,
      action: "payment.vendor_recorded",
      entityType: "Payment",
      entityId: payment.id,
      after: { billId: bill.id, amount: input.amount, remaining: newBalance },
    });

    return payment;
  });
}

export async function createPayment(
  companyId: string,
  actorUserId: string,
  input: CreatePaymentInput,
) {
  if (input.type === "customer") {
    return createCustomerPayment(companyId, actorUserId, input);
  }
  return createVendorPayment(companyId, actorUserId, input);
}
