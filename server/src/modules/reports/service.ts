import { prisma } from "../../db/client.js";
import { isDebitNormal } from "../../shared/accounting/accountTypes.js";
import { getAllAccountBalances, getAccountTotals } from "../../shared/accounting/balances.js";

export type ReportAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  balance: number;
};

export async function getIncomeStatement(companyId: string, from?: Date, to?: Date) {
  const range = { from, to };
  const all = await getAllAccountBalances(companyId, range);

  const income: ReportAccount[] = [];
  const expense: ReportAccount[] = [];

  for (const { account, balance } of all) {
    if (account.type === "income") {
      income.push({ ...account, balance });
    } else if (account.type === "expense") {
      expense.push({ ...account, balance });
    }
  }

  const totalIncome = income.reduce((sum, a) => sum + a.balance, 0);
  const totalExpense = expense.reduce((sum, a) => sum + a.balance, 0);

  return { income, expense, totalIncome, totalExpense, netIncome: totalIncome - totalExpense };
}

export async function getBalanceSheet(companyId: string, asOf?: Date) {
  const range = asOf ? { to: asOf } : {};
  const all = await getAllAccountBalances(companyId, range);

  const incomeRange = asOf ? { to: asOf } : {};
  const allForIncome = await getAllAccountBalances(companyId, incomeRange);

  let netIncome = 0;
  for (const { account, balance } of allForIncome) {
    if (account.type === "income") netIncome += balance;
    if (account.type === "expense") netIncome -= balance;
  }

  const assets: ReportAccount[] = [];
  const liabilities: ReportAccount[] = [];
  const equity: ReportAccount[] = [];

  for (const { account, balance } of all) {
    if (account.type === "asset") assets.push({ ...account, balance });
    else if (account.type === "liability") liabilities.push({ ...account, balance });
    else if (account.type === "equity") equity.push({ ...account, balance });
  }

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + netIncome;

  return { assets, liabilities, equity, netIncome, totalAssets, totalLiabilities, totalEquity };
}

export async function getTrialBalance(companyId: string, asOf?: Date) {
  const range = asOf ? { to: asOf } : {};
  const all = await getAllAccountBalances(companyId, range);

  const rows = all.map(({ account, totalDebit, totalCredit }) => {
    const net = totalDebit - totalCredit;
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: net >= 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    };
  });

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);

  return { rows, totalDebit, totalCredit };
}

export function getGeneralJournal(companyId: string, from?: Date, to?: Date) {
  const dateFilter =
    from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};

  return prisma.journalEntry.findMany({
    where: { companyId, status: "posted", ...dateFilter },
    include: { lines: { include: { account: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function getGeneralLedger(
  companyId: string,
  accountId: string,
  from?: Date,
  to?: Date,
) {
  const account = await prisma.account.findFirst({ where: { id: accountId, companyId } });
  if (!account) return null;

  const dateFilter =
    from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {};

  const lines = await prisma.journalLine.findMany({
    where: { accountId, journalEntry: { status: "posted", ...dateFilter } },
    include: { journalEntry: true },
    orderBy: [{ journalEntry: { date: "asc" } }],
  });

  const debitNormal = isDebitNormal(account.type as "asset" | "expense");
  let runningBalance = 0;
  const rows = lines.map((line) => {
    runningBalance += debitNormal ? line.debit - line.credit : line.credit - line.debit;
    return {
      date: line.journalEntry.date,
      memo: line.journalEntry.memo,
      debit: line.debit,
      credit: line.credit,
      runningBalance,
    };
  });

  return { account, rows };
}

export async function getArAging(companyId: string, asOf?: Date) {
  const asOfDate = asOf ?? new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["confirmed", "partially_paid"] },
      issueDate: { lte: asOfDate },
    },
    include: { customer: true },
    orderBy: { issueDate: "asc" },
  });

  return invoices.map((inv) => {
    const daysOutstanding = Math.floor(
      (asOfDate.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let bucket = "91+ dias";
    if (daysOutstanding <= 30) bucket = "0-30 dias";
    else if (daysOutstanding <= 60) bucket = "31-60 dias";
    else if (daysOutstanding <= 90) bucket = "61-90 dias";

    return {
      invoiceId: inv.id,
      number: inv.number,
      customerName: inv.customer.name,
      issueDate: inv.issueDate,
      balanceDue: inv.balanceDue,
      daysOutstanding,
      bucket,
    };
  });
}

export async function getApAging(companyId: string, asOf?: Date) {
  const asOfDate = asOf ?? new Date();

  const bills = await prisma.bill.findMany({
    where: {
      companyId,
      status: { in: ["confirmed", "partially_paid"] },
      issueDate: { lte: asOfDate },
    },
    include: { vendor: true },
    orderBy: { issueDate: "asc" },
  });

  return bills.map((bill) => {
    const daysOutstanding = Math.floor(
      (asOfDate.getTime() - bill.issueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let bucket = "91+ dias";
    if (daysOutstanding <= 30) bucket = "0-30 dias";
    else if (daysOutstanding <= 60) bucket = "31-60 dias";
    else if (daysOutstanding <= 90) bucket = "61-90 dias";

    return {
      billId: bill.id,
      number: bill.number,
      vendorName: bill.vendor.name,
      issueDate: bill.issueDate,
      balanceDue: bill.balanceDue,
      daysOutstanding,
      bucket,
    };
  });
}

export async function getSalesByCustomer(companyId: string, from?: Date, to?: Date) {
  const dateFilter = {
    ...(from ? { issueDate: { gte: from } } : {}),
    ...(to ? { issueDate: { lte: to } } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ["confirmed", "partially_paid", "paid"] }, ...dateFilter },
    include: { customer: true },
  });

  const byCustomer = new Map<string, { customerId: string; customerName: string; total: number; count: number }>();
  for (const inv of invoices) {
    const existing = byCustomer.get(inv.customerId) ?? { customerId: inv.customerId, customerName: inv.customer.name, total: 0, count: 0 };
    existing.total += inv.total;
    existing.count += 1;
    byCustomer.set(inv.customerId, existing);
  }

  return [...byCustomer.values()].sort((a, b) => b.total - a.total);
}

export async function getExpensesByCategory(companyId: string, from?: Date, to?: Date) {
  const dateFilter = {
    ...(from ? { date: { gte: from } } : {}),
    ...(to ? { date: { lte: to } } : {}),
  };

  const expenses = await prisma.expense.findMany({
    where: { companyId, status: "posted", ...dateFilter },
    include: { account: true },
  });

  const byCategory = new Map<string, { accountId: string; accountName: string; total: number; count: number }>();
  for (const exp of expenses) {
    const existing = byCategory.get(exp.accountId) ?? { accountId: exp.accountId, accountName: exp.account.name, total: 0, count: 0 };
    existing.total += exp.amount;
    existing.count += 1;
    byCategory.set(exp.accountId, existing);
  }

  return [...byCategory.values()].sort((a, b) => b.total - a.total);
}

export async function getCashFlow(companyId: string, from?: Date, to?: Date) {
  const cashAccounts = await prisma.account.findMany({
    where: {
      companyId,
      type: "asset",
      code: { in: ["1010", "1020"] },
    },
  });

  const flows = await Promise.all(
    cashAccounts.map(async (account) => {
      const { totalDebit, totalCredit } = await getAccountTotals(account.id, { from, to });
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        inflows: totalDebit,
        outflows: totalCredit,
        netChange: totalDebit - totalCredit,
      };
    }),
  );

  const totalNetChange = flows.reduce((sum, f) => sum + f.netChange, 0);
  return { flows, totalNetChange };
}

export async function getTaxSummary(companyId: string, from?: Date, to?: Date) {
  const dateFilter = {
    ...(from ? { issueDate: { gte: from } } : {}),
    ...(to ? { issueDate: { lte: to } } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ["confirmed", "partially_paid", "paid"] }, ...dateFilter },
    include: { lines: { include: { taxRate: true } } },
  });

  const byTaxRate = new Map<string, { name: string; rate: number; baseAmount: number; taxAmount: number }>();
  for (const inv of invoices) {
    for (const line of inv.lines) {
      if (!line.taxRateId || !line.taxRate || line.taxAmount === 0) continue;
      const existing = byTaxRate.get(line.taxRateId) ?? { name: line.taxRate.name, rate: line.taxRate.rate, baseAmount: 0, taxAmount: 0 };
      existing.baseAmount += line.lineTotal;
      existing.taxAmount += line.taxAmount;
      byTaxRate.set(line.taxRateId, existing);
    }
  }

  const totalTaxCollected = [...byTaxRate.values()].reduce((sum, t) => sum + t.taxAmount, 0);
  return { rows: [...byTaxRate.values()], totalTaxCollected };
}
