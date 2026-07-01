import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, findAccountByCode, onboard } from "../../../tests/fixtures.js";

describe("pagos de clientes", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  async function setupConfirmedInvoice(app: Awaited<ReturnType<typeof buildApp>>, token: string) {
    const customer = await createCustomer(app, token);
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 100000 }],
      },
    });
    const invoiceId = create.json().invoice.id as string;
    await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });
    return invoiceId;
  }

  it("registra un pago parcial y deja la factura en estado partially_paid", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const invoiceId = await setupConfirmedInvoice(app, token);
    const banco = await findAccountByCode(app, token, "1020");

    const payment = await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "customer", invoiceId, amount: 40000, date: "2026-06-30", accountId: banco.id },
    });
    expect(payment.statusCode).toBe(201);

    const invoice = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(invoice.json().invoice.status).toBe("partially_paid");
    expect(invoice.json().invoice.balanceDue).toBe(60000);

    await app.close();
  });

  it("un segundo pago que completa el saldo marca la factura como paid", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const invoiceId = await setupConfirmedInvoice(app, token);
    const banco = await findAccountByCode(app, token, "1020");

    await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "customer", invoiceId, amount: 40000, date: "2026-06-30", accountId: banco.id },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: { type: "customer", invoiceId, amount: 60000, date: "2026-06-30", accountId: banco.id },
    });
    expect(second.statusCode).toBe(201);

    const invoice = await app.inject({
      method: "GET",
      url: `/api/v1/invoices/${invoiceId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(invoice.json().invoice.status).toBe("paid");
    expect(invoice.json().invoice.balanceDue).toBe(0);

    const bancoBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${banco.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(bancoBalance.json().balance).toBe(100000);

    await app.close();
  });

  it("rechaza un pago que excede el saldo pendiente", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const invoiceId = await setupConfirmedInvoice(app, token);
    const banco = await findAccountByCode(app, token, "1020");

    const payment = await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "customer",
        invoiceId,
        amount: 999999,
        date: "2026-06-30",
        accountId: banco.id,
      },
    });
    expect(payment.statusCode).toBe(400);

    await app.close();
  });
});
