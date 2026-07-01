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

describe("impuestos", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea un impuesto y rechaza nombres duplicados", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "IVA 13%", rate: 13 },
    });
    expect(create.statusCode).toBe(201);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "IVA 13%", rate: 13 },
    });
    expect(duplicate.statusCode).toBe(409);

    await app.close();
  });

  it("rechaza una tasa fuera de rango", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tax-rates",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Tasa invalida", rate: 150 },
    });
    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
