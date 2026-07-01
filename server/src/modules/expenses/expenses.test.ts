import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { findAccountByCode, onboard } from "../../../tests/fixtures.js";

describe("gastos pagados", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea un gasto y refleja el saldo en la cuenta de gasto y la de pago", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const gastos = await findAccountByCode(app, token, "5020");
    const caja = await findAccountByCode(app, token, "1010");

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/expenses",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accountId: gastos.id,
        paidFromAccountId: caja.id,
        amount: 15000,
        date: "2026-06-30",
        memo: "Compra de utiles",
      },
    });
    expect(create.statusCode).toBe(201);

    const gastosBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${gastos.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(gastosBalance.json().balance).toBe(15000);

    const cajaBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${caja.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(cajaBalance.json().balance).toBe(-15000);

    await app.close();
  });

  it("anula un gasto y revierte los saldos", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const gastos = await findAccountByCode(app, token, "5020");
    const caja = await findAccountByCode(app, token, "1010");

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/expenses",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accountId: gastos.id,
        paidFromAccountId: caja.id,
        amount: 15000,
        date: "2026-06-30",
      },
    });
    const expenseId = create.json().expense.id as string;

    const voidResponse = await app.inject({
      method: "POST",
      url: `/api/v1/expenses/${expenseId}/void`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(voidResponse.statusCode).toBe(200);

    const gastosBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${gastos.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(gastosBalance.json().balance).toBe(0);

    const secondVoid = await app.inject({
      method: "POST",
      url: `/api/v1/expenses/${expenseId}/void`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(secondVoid.statusCode).toBe(409);

    await app.close();
  });
});
