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

describe("proveedores", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crea, edita y desactiva un proveedor", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/vendors",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Distribuidora Central" },
    });
    expect(create.statusCode).toBe(201);
    const vendorId = create.json().vendor.id as string;

    const update = await app.inject({
      method: "PATCH",
      url: `/api/v1/vendors/${vendorId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: "8888-0000" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().vendor.phone).toBe("8888-0000");

    const deactivate = await app.inject({
      method: "PATCH",
      url: `/api/v1/vendors/${vendorId}/active`,
      headers: { authorization: `Bearer ${token}` },
      payload: { active: false },
    });
    expect(deactivate.json().vendor.active).toBe(false);

    await app.close();
  });

  it("404 al editar un proveedor inexistente", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/vendors/no-existe",
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: "0000" },
    });
    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
