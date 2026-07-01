import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import {
  getArAging,
  getApAging,
  getBalanceSheet,
  getCashFlow,
  getExpensesByCategory,
  getGeneralJournal,
  getGeneralLedger,
  getIncomeStatement,
  getSalesByCustomer,
  getTaxSummary,
  getTrialBalance,
} from "./service.js";

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function reportsRoutes(app: FastifyInstance) {
  const preHandler = [authenticate, requirePermission("reports", "view")];

  app.get("/api/v1/reports/income-statement", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    return getIncomeStatement(request.authUser!.companyId, parseDate(from), parseDate(to));
  });

  app.get("/api/v1/reports/balance-sheet", { preHandler }, async (request) => {
    const { asOf } = request.query as { asOf?: string };
    return getBalanceSheet(request.authUser!.companyId, parseDate(asOf));
  });

  app.get("/api/v1/reports/trial-balance", { preHandler }, async (request) => {
    const { asOf } = request.query as { asOf?: string };
    return getTrialBalance(request.authUser!.companyId, parseDate(asOf));
  });

  app.get("/api/v1/reports/general-journal", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const entries = await getGeneralJournal(request.authUser!.companyId, parseDate(from), parseDate(to));
    return { entries };
  });

  app.get("/api/v1/reports/general-ledger", { preHandler }, async (request) => {
    const { accountId, from, to } = request.query as { accountId?: string; from?: string; to?: string };
    if (!accountId) return { account: null, rows: [] };
    const result = await getGeneralLedger(request.authUser!.companyId, accountId, parseDate(from), parseDate(to));
    return result ?? { account: null, rows: [] };
  });

  app.get("/api/v1/reports/ar-aging", { preHandler }, async (request) => {
    const { asOf } = request.query as { asOf?: string };
    const rows = await getArAging(request.authUser!.companyId, parseDate(asOf));
    return { rows };
  });

  app.get("/api/v1/reports/ap-aging", { preHandler }, async (request) => {
    const { asOf } = request.query as { asOf?: string };
    const rows = await getApAging(request.authUser!.companyId, parseDate(asOf));
    return { rows };
  });

  app.get("/api/v1/reports/sales-by-customer", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const rows = await getSalesByCustomer(request.authUser!.companyId, parseDate(from), parseDate(to));
    return { rows };
  });

  app.get("/api/v1/reports/expenses-by-category", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const rows = await getExpensesByCategory(request.authUser!.companyId, parseDate(from), parseDate(to));
    return { rows };
  });

  app.get("/api/v1/reports/cash-flow", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    return getCashFlow(request.authUser!.companyId, parseDate(from), parseDate(to));
  });

  app.get("/api/v1/reports/tax-summary", { preHandler }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    return getTaxSummary(request.authUser!.companyId, parseDate(from), parseDate(to));
  });
}
