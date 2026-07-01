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
  if (!account) throw new Error(`Cuenta ${code} no encontrada`);
  return account;
}

describe("productos", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea un producto asociado a una cuenta de ingreso y un impuesto", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const ingresoVentas = await findAccountByCode(app, token, "4010");

    const tax = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "IVA 13%", rate: 13 },
    });
    const taxRateId = tax.json().taxRate.id as string;

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        sku: "CAFE-1KG",
        name: "Cafe premium 1kg",
        type: "product",
        unitPrice: 500000,
        taxRateId,
        incomeAccountId: ingresoVentas.id,
        trackInventory: true,
        stockQuantity: 42,
      },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().product.sku).toBe("CAFE-1KG");

    await app.close();
  });

  it("rechaza un SKU duplicado", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const payload = { sku: "DUP-1", name: "Producto", type: "product", unitPrice: 1000 };
    await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(second.statusCode).toBe(409);

    await app.close();
  });

  it("rechaza un impuesto que no existe en la empresa", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/products",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        sku: "SVC-1",
        name: "Servicio de consultoria",
        type: "service",
        unitPrice: 2000,
        taxRateId: "no-existe",
      },
    });
    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
