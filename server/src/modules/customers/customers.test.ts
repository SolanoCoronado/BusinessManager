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

describe("clientes", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea un cliente y lo lista", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Cafe del Pueblo S.A." },
    });
    expect(create.statusCode).toBe(201);

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(list.json().customers).toHaveLength(1);

    await app.close();
  });

  it("rechaza datos invalidos (nombre vacio)", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "" },
    });
    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("rechaza asociar una cuenta contable que no existe", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Cliente X", defaultAccountId: "cuenta-inexistente" },
    });
    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("desactivar un cliente se refleja en el listado", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Cliente Y" },
    });
    const customerId = create.json().customer.id as string;

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/api/v1/customers/${customerId}/active`,
      headers: { authorization: `Bearer ${token}` },
      payload: { active: false },
    });
    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.json().customer.active).toBe(false);

    await app.close();
  });

  it("un usuario con rol ventas puede crear clientes pero no proveedores", async () => {
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
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "vero@wkd.test", password: "otra-contrasena-larga" },
    });
    const ventasToken = login.json().accessToken as string;

    const createCustomer = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${ventasToken}` },
      payload: { name: "Cliente de ventas" },
    });
    expect(createCustomer.statusCode).toBe(201);

    const createVendor = await app.inject({
      method: "POST",
      url: "/api/v1/vendors",
      headers: { authorization: `Bearer ${ventasToken}` },
      payload: { name: "Proveedor de ventas" },
    });
    expect(createVendor.statusCode).toBe(403);

    await app.close();
  });
});
