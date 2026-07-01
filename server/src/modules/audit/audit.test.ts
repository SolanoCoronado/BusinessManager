import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, onboard } from "../../../tests/fixtures.js";

describe("auditoria", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("registra y lista eventos de auditoria, mas recientes primero", async () => {
    const app = await buildApp();
    const token = await onboard(app);
    await createCustomer(app, token, "Cliente A");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const logs = response.json().logs as Array<{ action: string }>;
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].action).toBe("customer.created");
    expect(logs.some((l) => l.action === "company.onboarded")).toBe(true);

    await app.close();
  });

  it("un usuario con rol ventas no tiene acceso a la auditoria", async () => {
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

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/audit-logs",
      headers: { authorization: `Bearer ${ventasToken}` },
    });
    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
