import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";

const validPayload = {
  company: { displayName: "WKD PRODUCTS" },
  admin: { name: "Ada Admin", email: "ada@wkd.test", password: "contrasena-larga" },
};

describe("POST /api/v1/onboarding", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea la empresa y el usuario administrador, devuelve tokens", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/onboarding",
      payload: validPayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.company.displayName).toBe("WKD PRODUCTS");
    expect(body.user.role).toBe("admin");
    expect(typeof body.accessToken).toBe("string");
    expect(response.cookies.some((c) => c.name === "ledgerlocal_refresh")).toBe(true);

    await app.close();
  });

  it("rechaza un segundo onboarding cuando ya existe una empresa", async () => {
    const app = await buildApp();

    await app.inject({ method: "POST", url: "/api/v1/onboarding", payload: validPayload });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/onboarding",
      payload: validPayload,
    });

    expect(second.statusCode).toBe(409);

    await app.close();
  });

  it("rechaza datos invalidos", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/onboarding",
      payload: { company: { displayName: "" }, admin: { name: "", email: "no-es-correo", password: "123" } },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe("GET /api/v1/companies/exists", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("devuelve false antes del onboarding y true despues, sin requerir autenticacion", async () => {
    const app = await buildApp();

    const before = await app.inject({ method: "GET", url: "/api/v1/companies/exists" });
    expect(before.statusCode).toBe(200);
    expect(before.json()).toEqual({ exists: false });

    await app.inject({ method: "POST", url: "/api/v1/onboarding", payload: validPayload });

    const after = await app.inject({ method: "GET", url: "/api/v1/companies/exists" });
    expect(after.json()).toEqual({ exists: true });

    await app.close();
  });
});
