import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createVendor, findAccountByCode, onboard } from "../../../tests/fixtures.js";

describe("cuentas por pagar", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea y confirma una cuenta por pagar, generando el asiento", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const vendor = await createVendor(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/bills",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        vendorId: vendor.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Insumos de oficina", quantity: 1, unitPrice: 75000 }],
      },
    });
    expect(create.statusCode).toBe(201);
    const billId = create.json().bill.id as string;

    const confirm = await app.inject({
      method: "POST",
      url: `/api/v1/bills/${billId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().bill.status).toBe("confirmed");

    const ap = await findAccountByCode(app, token, "2010");
    const apBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${ap.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(apBalance.json().balance).toBe(75000);

    await app.close();
  });

  it("rechaza anular una cuenta por pagar confirmada con pagos aplicados", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const vendor = await createVendor(app, token);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/bills",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        vendorId: vendor.id,
        issueDate: "2026-06-30",
        lines: [{ description: "Insumos", quantity: 1, unitPrice: 50000 }],
      },
    });
    const billId = create.json().bill.id as string;
    await app.inject({
      method: "POST",
      url: `/api/v1/bills/${billId}/confirm`,
      headers: { authorization: `Bearer ${token}` },
    });

    const banco = await findAccountByCode(app, token, "1020");
    await app.inject({
      method: "POST",
      url: "/api/v1/payments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "vendor",
        billId,
        amount: 20000,
        date: "2026-06-30",
        accountId: banco.id,
      },
    });

    const voidResponse = await app.inject({
      method: "POST",
      url: `/api/v1/bills/${billId}/void`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(voidResponse.statusCode).toBe(400);

    await app.close();
  });
});
