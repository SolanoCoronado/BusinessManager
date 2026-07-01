import { prisma } from "../../db/client.js";
import { ValidationError } from "../errors/AppError.js";

export const FALLBACK_AR_ACCOUNT_CODE = "1100"; // Cuentas por Cobrar
export const FALLBACK_AP_ACCOUNT_CODE = "2010"; // Cuentas por Pagar
export const FALLBACK_INCOME_ACCOUNT_CODE = "4010"; // Ingresos por Ventas
export const FALLBACK_EXPENSE_ACCOUNT_CODE = "5020"; // Gastos Operativos
export const FALLBACK_TAX_ACCOUNT_CODE = "2020"; // Impuestos por Pagar

export async function getAccountByCode(companyId: string, code: string) {
  const account = await prisma.account.findUnique({
    where: { companyId_code: { companyId, code } },
  });
  if (!account) {
    throw new ValidationError(`Falta la cuenta contable ${code} en el catalogo de esta empresa.`);
  }
  return account;
}

export async function resolveCustomerReceivableAccount(
  companyId: string,
  customer: { defaultAccountId: string | null },
) {
  const explicit = customer.defaultAccountId
    ? await prisma.account.findFirst({ where: { id: customer.defaultAccountId, companyId } })
    : null;
  return explicit ?? getAccountByCode(companyId, FALLBACK_AR_ACCOUNT_CODE);
}

export async function resolveVendorPayableAccount(
  companyId: string,
  vendor: { defaultAccountId: string | null },
) {
  const explicit = vendor.defaultAccountId
    ? await prisma.account.findFirst({ where: { id: vendor.defaultAccountId, companyId } })
    : null;
  return explicit ?? getAccountByCode(companyId, FALLBACK_AP_ACCOUNT_CODE);
}
