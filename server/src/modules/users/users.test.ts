import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";

const onboardingPayload = {
  company: { displayName: "WKD PRODUCTS" },
  admin: { name: "Ada Admin", email: "ada@wkd.test", password: "contrasena-larga" },
};

async function onboardAndLogin(app: Awaited<ReturnType<typeof buildApp>>) {
  const onboarding = await app.inject({
    method: "POST",
    url: "/api/v1/onboarding",
    payload: onboardingPayload,
  });
  return onboarding.json().accessToken as string;
}

describe("usuarios y permisos por rol", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("admin puede crear un usuario con rol ventas", async () => {
    const app = await buildApp();
    const adminToken = await onboardAndLogin(app);

    const response = await app.inject({
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

    expect(response.statusCode).toBe(201);
    expect(response.json().user.role).toBe("ventas");

    await app.close();
  });

  it("un usuario con rol ventas no puede listar usuarios", async () => {
    const app = await buildApp();
    const adminToken = await onboardAndLogin(app);

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

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: { authorization: `Bearer ${ventasToken}` },
    });

    expect(listResponse.statusCode).toBe(403);

    await app.close();
  });

  it("desactivar un usuario le impide iniciar sesion despues", async () => {
    const app = await buildApp();
    const adminToken = await onboardAndLogin(app);

    const created = await app.inject({
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
    const userId = created.json().user.id as string;

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${userId}/active`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { active: false },
    });
    expect(deactivate.statusCode).toBe(200);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "vero@wkd.test", password: "otra-contrasena-larga" },
    });
    expect(login.statusCode).toBe(401);

    await app.close();
  });
});
