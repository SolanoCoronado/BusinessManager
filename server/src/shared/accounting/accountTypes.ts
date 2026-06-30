export const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

const DEBIT_NORMAL_TYPES: ReadonlySet<AccountType> = new Set(["asset", "expense"]);

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL_TYPES.has(type);
}

export function computeBalance(type: AccountType, totalDebit: number, totalCredit: number): number {
  return isDebitNormal(type) ? totalDebit - totalCredit : totalCredit - totalDebit;
}
