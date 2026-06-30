export const DEFAULT_COMPANY_PROFILE = {
  displayName: "WKD PRODUCTS",
  legalName: "WKD PRODUCTS",
  taxId: "",
  baseCurrency: "CRC",
  secondaryCurrency: "USD",
  locale: "es-CR",
} as const;

export type CompanyProfile = typeof DEFAULT_COMPANY_PROFILE;
