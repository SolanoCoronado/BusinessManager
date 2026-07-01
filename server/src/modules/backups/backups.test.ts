import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { prisma } from "../../db/client.js";
import { resetDatabase } from "../../../tests/resetDb.js";
import { createCustomer, onboard } from "../../../tests/fixtures.js";

describe("respaldos: crear, listar, restaurar", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("crear -> agregar datos -> restaurar revierte al estado del respaldo", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    await createCustomer(app, token, "Cliente A");

    const backupRes = await app.inject({
      method: "POST",
      url: "/api/v1/backups",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(backupRes.statusCode).toBe(201);
    const filename = backupRes.json().backup.filename as string;
    expect(filename).toMatch(/^backup-\d{8}T\d{6}\.db$/);

    await createCustomer(app, token, "Cliente B");

    const beforeRestore = await app.inject({
      method: "GET",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(beforeRestore.json().customers).toHaveLength(2);

    const restoreRes = await app.inject({
      method: "POST",
      url: `/api/v1/backups/${filename}/restore`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().restoredFrom).toBe(filename);

    const afterRestore = await app.inject({
      method: "GET",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(afterRestore.json().customers).toHaveLength(1);
    expect(afterRestore.json().customers[0].name).toBe("Cliente A");

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/backups",
      headers: { authorization: `Bearer ${token}` },
    });
    const filenames = list.json().backups.map((b: { filename: string }) => b.filename);
    expect(filenames).toContain(filename);
    expect(filenames.some((f: string) => f.startsWith("pre-restore-"))).toBe(true);

    await app.close();
  });

  it("rechaza restaurar un archivo que no existe", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/backups/backup-20260101T000000.db/restore",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("rechaza nombres de archivo con intento de path traversal", async () => {
    const app = await buildApp();
    const token = await onboard(app);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/backups/${encodeURIComponent("../../../etc/passwd")}/restore`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it("un usuario con rol ventas no tiene acceso a respaldos", async () => {
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
      url: "/api/v1/backups",
      headers: { authorization: `Bearer ${ventasToken}` },
    });
    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it("un usuario con rol contable puede crear respaldos pero no restaurarlos", async () => {
    const app = await buildApp();
    const adminToken = await onboard(app);

    await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Carlos Contable",
        email: "carlos@wkd.test",
        password: "otra-contrasena-larga",
        role: "contable",
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "carlos@wkd.test", password: "otra-contrasena-larga" },
    });
    const contableToken = login.json().accessToken as string;

    const create = await app.inject({
      method: "POST",
      url: "/api/v1/backups",
      headers: { authorization: `Bearer ${contableToken}` },
    });
    expect(create.statusCode).toBe(201);
    const filename = create.json().backup.filename as string;

    const restore = await app.inject({
      method: "POST",
      url: `/api/v1/backups/${filename}/restore`,
      headers: { authorization: `Bearer ${contableToken}` },
    });
    expect(restore.statusCode).toBe(403);

    await app.close();
  });
});
