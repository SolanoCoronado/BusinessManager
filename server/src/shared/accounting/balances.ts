import { prisma } from "../../db/client.js";
import { computeBalance, isAccountType } from "./accountTypes.js";

type DateRange = { from?: Date; to?: Date };

export async function getAccountTotals(accountId: string, range: DateRange = {}) {
  const dateFilter =
    range.from || range.to
      ? {
          date: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};

  const result = await prisma.journalLine.aggregate({
    where: {
      accountId,
      journalEntry: { status: "posted", ...dateFilter },
    },
    _sum: { debit: true, credit: true },
  });

  return {
    totalDebit: result._sum.debit ?? 0,
    totalCredit: result._sum.credit ?? 0,
  };
}

export async function getAccountBalance(accountId: string, range: DateRange = {}) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || !isAccountType(account.type)) {
    return { balance: 0, totalDebit: 0, totalCredit: 0 };
  }

  const { totalDebit, totalCredit } = await getAccountTotals(accountId, range);
  const balance = computeBalance(account.type, totalDebit, totalCredit);
  return { balance, totalDebit, totalCredit };
}

export async function getAllAccountBalances(companyId: string, range: DateRange = {}) {
  const accounts = await prisma.account.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  return Promise.all(
    accounts.map(async (account) => {
      const { balance, totalDebit, totalCredit } = await getAccountBalance(account.id, range);
      return { account, balance, totalDebit, totalCredit };
    }),
  );
}
