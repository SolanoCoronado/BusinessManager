export const SUPPORTED_CURRENCIES = [
  { code: "CRC", label: "Colon costarricense" },
  { code: "USD", label: "Dolar estadounidense" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];
