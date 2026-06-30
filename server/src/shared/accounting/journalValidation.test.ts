import { describe, expect, it } from "vitest";

import { validateBalancedJournalEntry } from "./journalValidation.js";

describe("validateBalancedJournalEntry", () => {
  it("acepta un asiento balanceado de dos lineas", () => {
    const result = validateBalancedJournalEntry([
      { accountId: "a", debit: 1000, credit: 0 },
      { accountId: "b", debit: 0, credit: 1000 },
    ]);

    expect(result).toEqual({ valid: true, totalDebit: 1000, totalCredit: 1000 });
  });

  it("rechaza un asiento desbalanceado", () => {
    const result = validateBalancedJournalEntry([
      { accountId: "a", debit: 1000, credit: 0 },
      { accountId: "b", debit: 0, credit: 900 },
    ]);

    expect(result.valid).toBe(false);
  });

  it("rechaza una linea con debito y credito a la vez", () => {
    const result = validateBalancedJournalEntry([
      { accountId: "a", debit: 100, credit: 100 },
      { accountId: "b", debit: 0, credit: 100 },
    ]);

    expect(result.valid).toBe(false);
  });

  it("rechaza menos de dos lineas", () => {
    const result = validateBalancedJournalEntry([{ accountId: "a", debit: 100, credit: 0 }]);

    expect(result.valid).toBe(false);
  });
});
