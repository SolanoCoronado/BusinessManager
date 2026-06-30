import { describe, expect, it } from "vitest";

import { computeBalance, isAccountType } from "./accountTypes.js";

describe("accountTypes", () => {
  it("isAccountType valida solo los tipos conocidos", () => {
    expect(isAccountType("asset")).toBe(true);
    expect(isAccountType("inversion")).toBe(false);
  });

  it("computeBalance: cuentas de activo son debito-normal", () => {
    expect(computeBalance("asset", 1000, 300)).toBe(700);
  });

  it("computeBalance: cuentas de ingreso son credito-normal", () => {
    expect(computeBalance("income", 100, 1000)).toBe(900);
  });
});
