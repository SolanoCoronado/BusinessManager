import { describe, expect, it } from "vitest";

import { validateBalancedJournalEntry } from "../services/journalValidation";

describe("validateBalancedJournalEntry", () => {
  it("accepts a balanced entry", () => {
    const result = validateBalancedJournalEntry([
      { accountId: "cash", debitAmount: 1000, creditAmount: 0 },
      { accountId: "income", debitAmount: 0, creditAmount: 1000 },
    ]);

    expect(result).toEqual({ valid: true, totalDebit: 1000, totalCredit: 1000 });
  });

  it("rejects an unbalanced entry", () => {
    const result = validateBalancedJournalEntry([
      { accountId: "cash", debitAmount: 1000, creditAmount: 0 },
      { accountId: "income", debitAmount: 0, creditAmount: 900 },
    ]);

    expect(result).toEqual({
      valid: false,
      reason: "El asiento no esta balanceado.",
    });
  });
});
