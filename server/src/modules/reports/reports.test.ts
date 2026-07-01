import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, createVendor, findAccountByCode, onboard } from "../../../tests/fixtures.js";

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

describe("libro diario", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("lista los asientos generados al confirmar una factura", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/general-journal",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const entries = response.json().entries as Array<{ lines: unknown[] }>;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => Array.isArray(e.lines))).toBe(true);

    await app.close();
  });
});

describe("libro mayor", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("muestra saldo corriente de la cuenta de banco despues de un pago", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const { bancoId } = await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/reports/general-ledger?accountId=${bancoId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { rows: Array<{ runningBalance: number }> };
    expect(body.rows.length).toBeGreaterThan(0);
    const last = body.rows.at(-1)!;
    expect(last.runningBalance).toBe(200000);

    await app.close();
  });

  it("devuelve rows vacio si no se pasa accountId", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/general-ledger",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().rows).toHaveLength(0);

    await app.close();
  });
});

describe("antigüedad de cuentas por cobrar", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("muestra facturas pendientes de cobro con su bucket de dias", async () => {
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
        lines: [{ description: "Servicio pendiente", quantity: 1, unitPrice: 50000 }],
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
      url: "/api/v1/reports/ar-aging",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const rows = response.json().rows as Array<{ balanceDue: number; bucket: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].balanceDue).toBe(50000);
    expect(typeof rows[0].bucket).toBe("string");

    await app.close();
  });

  it("no incluye facturas pagadas en su totalidad", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await setupInvoiceAndPayment(app, token);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/ar-aging",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().rows).toHaveLength(0);

    await app.close();
  });
});

describe("antigüedad de cuentas por pagar", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("muestra facturas de proveedor pendientes de pago", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const vendor = await createVendor(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/bills",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        vendorId: vendor.id,
        issueDate: "2026-06-15",
        lines: [{ description: "Insumos", quantity: 1, unitPrice: 30000 }],
      },
    });
    const billId = create.json().bill.id as string;
    await app.inject({
      method: "POST",
      url: `/api/v1/bills/${billId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/ap-aging",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const rows = response.json().rows as Array<{ balanceDue: number; vendorName: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].balanceDue).toBe(30000);
    expect(rows[0].vendorName).toBe("Distribuidora Central");

    await app.close();
  });
});

describe("gastos por categoria", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("agrupa los gastos por cuenta contable", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const gastos = await findAccountByCode(app, token, "5020");
    const caja = await findAccountByCode(app, token, "1010");

    await app.inject({
      method: "POST",
      url: "/api/v1/expenses",
      headers: { authorization: `Bearer ${token}` },
      payload: { accountId: gastos.id, paidFromAccountId: caja.id, amount: 12000, date: "2026-06-20" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/expenses",
      headers: { authorization: `Bearer ${token}` },
      payload: { accountId: gastos.id, paidFromAccountId: caja.id, amount: 8000, date: "2026-06-21" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/expenses-by-category",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const rows = response.json().rows as Array<{ accountName: string; total: number; count: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(20000);
    expect(rows[0].count).toBe(2);

    await app.close();
  });
});

describe("resumen de impuestos", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("suma el impuesto cobrado en facturas confirmadas con IVA", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const taxRes = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "IVA 13%", rate: 13 },
    });
    const taxRateId = taxRes.json().taxRate.id as string;

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-20",
        lines: [{ description: "Producto con IVA", quantity: 1, unitPrice: 100000, taxRateId }],
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
      url: "/api/v1/reports/tax-summary",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const { rows, totalTaxCollected } = response.json() as {
      rows: Array<{ name: string; taxAmount: number }>;
      totalTaxCollected: number;
    };
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("IVA 13%");
    expect(rows[0].taxAmount).toBe(13000);
    expect(totalTaxCollected).toBe(13000);

    await app.close();
  });

  it("devuelve total cero si no hay facturas con impuesto confirmadas", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/tax-summary",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().totalTaxCollected).toBe(0);
    expect(response.json().rows).toHaveLength(0);

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
