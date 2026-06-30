import { prisma } from "../src/db/client.js";

export async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}
