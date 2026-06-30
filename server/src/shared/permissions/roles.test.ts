import { describe, expect, it } from "vitest";

import { can, isRole } from "./roles.js";

describe("roles y permisos", () => {
  it("admin puede todo sobre usuarios", () => {
    expect(can("admin", "users", "create")).toBe(true);
    expect(can("admin", "users", "delete")).toBe(true);
  });

  it("ventas no puede gestionar usuarios", () => {
    expect(can("ventas", "users", "view")).toBe(false);
    expect(can("ventas", "users", "create")).toBe(false);
  });

  it("contable puede crear facturas pero no eliminarlas", () => {
    expect(can("contable", "invoices", "create")).toBe(true);
    expect(can("contable", "invoices", "delete")).toBe(false);
  });

  it("isRole valida solo los roles conocidos", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
  });
});
