import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";

const onboardingPayload = {
  company: { displayName: "WKD PRODUCTS" },
  admin: { name: "Ada Admin", email: "ada@wkd.test", password: "contrasena-larga" },
};

async function onboard(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/onboarding",
    payload: onboardingPayload,
  });
  return response.json().accessToken as string;
}

async function findAccountByCode(
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  code: string,
) {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/accounting/accounts",
    headers: { authorization: `Bearer ${token}` },
  });
  const accounts = response.json().accounts as Array<{ id: string; code: string }>;
  const account = accounts.find((a) => a.code === code);
  if (!account) throw new Error(`Cuenta ${code} no encontrada en el seed`);
  return account;
}

describe("catalogo de cuentas", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("el onboarding siembra un catalogo inicial de cuentas", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/accounting/accounts",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const accounts = response.json().accounts as Array<{ code: string }>;
    expect(accounts.length).toBeGreaterThan(10);
    expect(accounts.some((a) => a.code === "1020")).toBe(true);

    await app.close();
  });

  it("rechaza crear una cuenta con un codigo duplicado", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/accounting/accounts",
      headers: { authorization: `Bearer ${token}` },
      payload: { code: "1020", name: "Banco duplicado", type: "asset" },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });
});

describe("motor de asientos de partida doble", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea un asiento balanceado y actualiza los saldos de cuenta", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const banco = await findAccountByCode(app, token, "1020");
    const ventas = await findAccountByCode(app, token, "4010");

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/accounting/journal-entries",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        date: "2026-06-30",
        memo: "Venta de contado",
        lines: [
          { accountId: banco.id, debit: 50000, credit: 0 },
          { accountId: ventas.id, debit: 0, credit: 50000 },
        ],
      },
    });

    expect(create.statusCode).toBe(201);

    const bancoBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${banco.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(bancoBalance.json().balance).toBe(50000);

    const ventasBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${ventas.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(ventasBalance.json().balance).toBe(50000);

    await app.close();
  });

  it("rechaza un asiento desbalanceado", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const banco = await findAccountByCode(app, token, "1020");
    const ventas = await findAccountByCode(app, token, "4010");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/accounting/journal-entries",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        date: "2026-06-30",
        lines: [
          { accountId: banco.id, debit: 50000, credit: 0 },
          { accountId: ventas.id, debit: 0, credit: 40000 },
        ],
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("revierte un asiento confirmado y deja el saldo en cero", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const banco = await findAccountByCode(app, token, "1020");
    const ventas = await findAccountByCode(app, token, "4010");

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/accounting/journal-entries",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        date: "2026-06-30",
        lines: [
          { accountId: banco.id, debit: 50000, credit: 0 },
          { accountId: ventas.id, debit: 0, credit: 50000 },
        ],
      },
    });
    const entryId = create.json().entry.id as string;

    const reverse = await app.inject({
      method: "POST",
      url: `/api/v1/accounting/journal-entries/${entryId}/reverse`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(reverse.statusCode).toBe(201);

    const bancoBalance = await app.inject({
      method: "GET",
      url: `/api/v1/accounting/accounts/${banco.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(bancoBalance.json().balance).toBe(0);

    const secondReverse = await app.inject({
      method: "POST",
      url: `/api/v1/accounting/journal-entries/${entryId}/reverse`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(secondReverse.statusCode).toBe(409);

    await app.close();
  });

  it("un usuario con rol ventas no puede crear asientos, pero si verlos", async () => {
    const app = await buildApp();
    const adminToken = await onboard(app);

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
    const ventasLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "vero@wkd.test", password: "otra-contrasena-larga" },
    });
    const ventasToken = ventasLogin.json().accessToken as string;

    const banco = await findAccountByCode(app, adminToken, "1020");
    const ventasAccount = await findAccountByCode(app, adminToken, "4010");

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/accounting/journal-entries",
      headers: { authorization: `Bearer ${ventasToken}` },
      payload: {
        date: "2026-06-30",
        lines: [
          { accountId: banco.id, debit: 1000, credit: 0 },
          { accountId: ventasAccount.id, debit: 0, credit: 1000 },
        ],
      },
    });
    expect(create.statusCode).toBe(403);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/accounting/journal-entries",
      headers: { authorization: `Bearer ${ventasToken}` },
    });
    expect(list.statusCode).toBe(200);

    await app.close();
  });
});
