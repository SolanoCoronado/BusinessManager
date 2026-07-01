import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { findAccountByCode, onboard } from "../../../tests/fixtures.js";

async function createBankAccount(
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  accountId: string,
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/banking/bank-accounts",
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "Banco Nacional", accountId },
  });
  return response.json().bankAccount as { id: string };
}

describe("cuentas bancarias", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea una cuenta bancaria asociada a una cuenta de activo", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/banking/bank-accounts",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Banco Nacional", accountId: banco.id },
    });

    expect(response.statusCode).toBe(201);

    await app.close();
  });

  it("rechaza asociar la misma cuenta contable a dos cuentas bancarias", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");

    await createBankAccount(app, token, banco.id);
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/banking/bank-accounts",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Otra cuenta", accountId: banco.id },
    });

    expect(second.statusCode).toBe(409);

    await app.close();
  });

  it("rechaza asociar una cuenta que no es de tipo activo", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const ingresos = await findAccountByCode(app, token, "4010");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/banking/bank-accounts",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Invalida", accountId: ingresos.id },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe("movimientos bancarios e importacion", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("importa movimientos y detecta duplicados en una segunda importacion", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");
    const bankAccount = await createBankAccount(app, token, banco.id);

    const rows = [
      { date: "2026-06-01", description: "Deposito cliente", amount: 50000 },
      { date: "2026-06-02", description: "Pago de servicios", amount: -10000 },
    ];

    const first = await app.inject({
      method: "POST",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rows },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ imported: 2, skippedDuplicates: 0 });

    const second = await app.inject({
      method: "POST",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rows },
    });
    expect(second.json()).toMatchObject({ imported: 0, skippedDuplicates: 2 });

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/transactions`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(list.json().transactions).toHaveLength(2);

    await app.close();
  });

  it("registra un movimiento manual", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");
    const bankAccount = await createBankAccount(app, token, banco.id);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/transactions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { date: "2026-06-15", description: "Retiro", amount: -5000 },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().transaction.status).toBe("pending");

    await app.close();
  });
});

describe("conciliacion bancaria", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("flujo completo: iniciar, marcar movimientos, completar y calcular diferencia", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");
    const gastos = await findAccountByCode(app, token, "5020");
    const bankAccount = await createBankAccount(app, token, banco.id);

    // Genera actividad real en el libro mayor de Banco (gasto pagado desde Banco).
    await app.inject({
      method: "POST",
      url: "/api/v1/expenses",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        accountId: gastos.id,
        paidFromAccountId: banco.id,
        amount: 20000,
        date: "2026-06-10",
      },
    });

    const importRes = await app.inject({
      method: "POST",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        rows: [{ date: "2026-06-10", description: "Pago de gastos", amount: -20000 }],
      },
    });
    const transactionId = (
      await app.inject({
        method: "GET",
        url: `/api/v1/banking/bank-accounts/${bankAccount.id}/transactions`,
        headers: { authorization: `Bearer ${token}` },
      })
    ).json().transactions[0].id as string;
    expect(importRes.statusCode).toBe(200);

    const start = await app.inject({
      method: "POST",
      url: "/api/v1/banking/reconciliations",
      headers: { authorization: `Bearer ${token}` },
      payload: { bankAccountId: bankAccount.id, periodEnd: "2026-06-30", statementEndingBalance: -20000 },
    });
    expect(start.statusCode).toBe(201);
    const reconciliationId = start.json().reconciliation.id as string;

    const match = await app.inject({
      method: "PATCH",
      url: `/api/v1/banking/reconciliations/${reconciliationId}/transactions/${transactionId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { matched: true },
    });
    expect(match.json().transaction.status).toBe("matched");

    const complete = await app.inject({
      method: "POST",
      url: `/api/v1/banking/reconciliations/${reconciliationId}/complete`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json().reconciliation.status).toBe("completed");
    expect(complete.json().reconciliation.bookBalance).toBe(-20000);
    expect(complete.json().reconciliation.difference).toBe(0);

    const txAfter = await app.inject({
      method: "GET",
      url: `/api/v1/banking/bank-accounts/${bankAccount.id}/transactions?status=reconciled`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(txAfter.json().transactions).toHaveLength(1);

    await app.close();
  });

  it("rechaza iniciar una segunda conciliacion mientras hay una en progreso", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    const banco = await findAccountByCode(app, token, "1020");
    const bankAccount = await createBankAccount(app, token, banco.id);

    await app.inject({
      method: "POST",
      url: "/api/v1/banking/reconciliations",
      headers: { authorization: `Bearer ${token}` },
      payload: { bankAccountId: bankAccount.id, periodEnd: "2026-06-30", statementEndingBalance: 0 },
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/banking/reconciliations",
      headers: { authorization: `Bearer ${token}` },
      payload: { bankAccountId: bankAccount.id, periodEnd: "2026-06-30", statementEndingBalance: 0 },
    });
    expect(second.statusCode).toBe(409);

    await app.close();
  });
});
