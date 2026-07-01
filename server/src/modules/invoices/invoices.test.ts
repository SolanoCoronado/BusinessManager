import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, findAccountByCode, onboard } from "../../../tests/fixtures.js";

describe("facturas", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea una factura en borrador con impuesto calculado", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const taxRate = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "IVA 13%", rate: 13 },
    });

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [
          {
            description: "Cafe premium 1kg",
            quantity: 2,
            unitPrice: 500000,
            taxRateId: taxRate.json().taxRate.id,
          },
        ],
      },
    });

    expect(create.statusCode).toBe(201);
    const invoice = create.json().invoice;
    expect(invoice.status).toBe("draft");
    expect(invoice.subtotal).toBe(1000000);
    expect(invoice.taxTotal).toBe(130000);
    expect(invoice.total).toBe(1130000);
    expect(invoice.balanceDue).toBe(1130000);

    await app.close();
  });

  it("confirma una factura y genera el asiento contable balanceado", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Servicio de consultoria", quantity: 1, unitPrice: 200000 }],
      },
    });
    const invoiceId = create.json().invoice.id as string;

    const confirm = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().invoice.status).toBe("confirmed");

    const ar = await findAccountByCode(app, token, "1100");
    const arBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${ar.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(arBalance.json().balance).toBe(200000);

    const second = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(400);

    await app.close();
  });

  it("anula una factura confirmada sin pagos y revierte el asiento", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 50000 }],
      },
    });
    const invoiceId = create.json().invoice.id as string;

    await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    const voidResponse = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/void`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(voidResponse.statusCode).toBe(200);
    expect(voidResponse.json().invoice.status).toBe("void");

    const ar = await findAccountByCode(app, token, "1100");
    const arBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${ar.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(arBalance.json().balance).toBe(0);

    await app.close();
  });

  it("rechaza anular una factura confirmada con pagos aplicados", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const customer = await createCustomer(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 50000 }],
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
      payload: { type: "customer", invoiceId, amount: 20000, date: "2026-06-30", accountId: banco.id },
    });

    const voidResponse = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/void`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(voidResponse.statusCode).toBe(400);

    await app.close();
  });

  it("un usuario con rol ventas puede crear facturas pero no confirmarlas", async () => {
    const app = await buildApp();
    const adminToken = await onboard(app);
    const customer = await createCustomer(app, adminToken);

    await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Vero Ventas",
        email: "vero@wkd.test",
        password: "otra-contrasena-larga",
        role: "ventas",
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "vero@wkd.test", password: "otra-contrasena-larga" },
    });
    const ventasToken = login.json().accessToken as string;

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/invoices",
      headers: { authorization: `Bearer ${ventasToken}` },
      payload: {
        customerId: customer.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Servicio", quantity: 1, unitPrice: 10000 }],
      },
    });
    expect(create.statusCode).toBe(201);
    const invoiceId = create.json().invoice.id as string;

    const confirm = await app.inject({
      method: "POST",
      url: `/api/v1/invoices/${invoiceId}/confirm`,
      headers: { authorization: `Bearer ${ventasToken}` },
    });
    expect(confirm.statusCode).toBe(403);

    await app.close();
  });
});
