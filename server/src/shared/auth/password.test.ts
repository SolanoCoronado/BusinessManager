import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("genera un hash distinto al texto plano y lo verifica correctamente", async () => {
    const hash = await hashPassword("super-secreta-123");

    expect(hash).not.toBe("super-secreta-123");
    expect(await verifyPassword(hash, "super-secreta-123")).toBe(true);
  });

  it("rechaza una contrasena incorrecta", async () => {
    const hash = await hashPassword("super-secreta-123");

    expect(await verifyPassword(hash, "otra-cosa")).toBe(false);
  });
});
