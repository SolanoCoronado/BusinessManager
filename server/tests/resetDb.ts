import { prisma } from "../src/db/client.js";

export async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.reconciliation.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billLine.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.product.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}
