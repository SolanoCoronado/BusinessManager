import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, findAccountByCode, onboard } from "../../../tests/fixtures.js";

async function setupInvoiceAndPayment(app: Awaited<ReturnType<typeof buildApp>>, token: string) {
  const customer = await createCustomer(app, token);

  const create = await app.inject({
    method: "POST",
    url: "/api/v1/invoices",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      customerId: customer.id,
      issueDate: "2026-06-15",
      lines: [{ description: "Servicio de consultoria", quantity: 2, unitPrice: 100000 }],
    },
  });
  const invoiceId = create.json().invoice.id as string;

  await app.inject({
    method: "POST",
    url: `/api/v1/invoices/${invoiceId}/confirm`,
    headers: { authorization: `Bearer ${token}` },
  });

  const banco = await findAccountByCode(app, token, "1020");
  await app.inject({
    method: "POST",
    url: "/api/v1/payments",
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "customer", invoiceId, amount: 200000, date: "2026-06-20", accountId: banco.id },
  });

  return { invoiceId, bancoId: banco.id };
}

describe("estado de resultados", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("refleja los ingresos de una factura confirmada", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/income-statement",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.totalIncome).toBe(200000);
    expect(body.totalExpense).toBe(0);
    expect(body.netIncome).toBe(200000);

    await app.close();
  });
});

describe("balance general", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("activos = pasivos + patrimonio (incluyendo utilidad del periodo)", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/balance-sheet",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const { totalAssets, totalLiabilities, totalEquity, netIncome } = response.json();
    expect(totalAssets).toBe(200000);
    expect(netIncome).toBe(200000);
    expect(Math.abs(totalAssets - (totalLiabilities + totalEquity))).toBeLessThan(2);

    await app.close();
  });
});

describe("balance de comprobacion", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("la suma de debitos iguala la suma de creditos", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/trial-balance",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const { totalDebit, totalCredit } = response.json();
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBeGreaterThan(0);

    await app.close();
  });
});

describe("reportes operativos", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("ventas por cliente muestra el total de facturas confirmadas", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-15",
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 75000 }],
      },
    });
    const invoiceId = create.json().invoice.id as string;
    await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/sales-by-customer",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const rows = response.json().rows as Array<{ customerName: string; total: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(75000);

    await app.close();
  });

  it("flujo de caja refleja ingresos y pagos en cuentas de banco/caja", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/cash-flow",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().totalNetChange).toBe(200000);

    await app.close();
  });
});
