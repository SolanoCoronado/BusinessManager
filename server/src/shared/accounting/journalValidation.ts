export type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
};

export type JournalValidationResult =
  | { valid: true; totalDebit: number; totalCredit: number }
  | { valid: false; reason: string };

export function validateBalancedJournalEntry(lines: JournalLineInput[]): JournalValidationResult {
  if (lines.length < 2) {
    return { valid: false, reason: "Un asiento requiere al menos dos lineas." };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      return { valid: false, reason: "Los montos no pueden ser negativos." };
    }

    if (line.debit > 0 && line.credit > 0) {
      return { valid: false, reason: "Una linea no puede tener debito y credito simultaneamente." };
    }

    if (line.debit === 0 && line.credit === 0) {
      return { valid: false, reason: "Cada linea requiere un monto." };
    }

    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  if (totalDebit !== totalCredit) {
    return { valid: false, reason: "El asiento no esta balanceado." };
  }

  return { valid: true, totalDebit, totalCredit };
}
