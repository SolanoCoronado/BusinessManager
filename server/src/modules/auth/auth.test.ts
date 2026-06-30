import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";

const onboardingPayload = {
  company: { displayName: "WKD PRODUCTS" },
  admin: { name: "Ada Admin", email: "ada@wkd.test", password: "contrasena-larga" },
};

describe("auth: login, me, refresh, logout", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("permite iniciar sesion con credenciales correctas y consultar /me", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/v1/onboarding", payload: onboardingPayload });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ada@wkd.test", password: "contrasena-larga" },
    });

    expect(login.statusCode).toBe(200);
    const { accessToken } = login.json();

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe("ada@wkd.test");

    await app.close();
  });

  it("rechaza credenciales incorrectas", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/v1/onboarding", payload: onboardingPayload });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ada@wkd.test", password: "incorrecta" },
    });

    expect(login.statusCode).toBe(401);

    await app.close();
  });

  it("rechaza /me sin token", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("renueva el access token usando la cookie de refresh", async () => {
    const app = await buildApp();
    await app.inject({ method: "POST", url: "/api/v1/onboarding", payload: onboardingPayload });

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ada@wkd.test", password: "contrasena-larga" },
    });

    const refreshCookie = login.cookies.find((c) => c.name === "ledgerlocal_refresh");
    expect(refreshCookie).toBeDefined();

    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { ledgerlocal_refresh: refreshCookie!.value },
    });

    expect(refresh.statusCode).toBe(200);
    expect(typeof refresh.json().accessToken).toBe("string");

    await app.close();
  });
});
