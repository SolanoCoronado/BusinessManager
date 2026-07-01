import type { buildApp } from "../src/app.js";

type App = Awaited<ReturnType<typeof buildApp>>;

export const onboardingPayload = {
  company: { displayName: "WKD PRODUCTS" },
  admin: { name: "Ada Admin", email: "ada@wkd.test", password: "contrasena-larga" },
};

export async function onboard(app: App) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/onboarding",
    payload: onboardingPayload,
  });
  return response.json().accessToken as string;
}

export async function findAccountByCode(app: App, token: string, code: string) {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/accounting/accounts",
    headers: { authorization: `Bearer ${token}` },
  });
  const accounts = response.json().accounts as Array<{ id: string; code: string }>;
  const account = accounts.find((a) => a.code === code);
  if (!account) throw new Error(`Cuenta ${code} no encontrada en el seed`);
  return account;
}

export async function createCustomer(app: App, token: string, name = "Cafe del Pueblo S.A.") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/customers",
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  return response.json().customer as { id: string; name: string };
}

export async function createVendor(app: App, token: string, name = "Distribuidora Central") {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/vendors",
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  return response.json().vendor as { id: string; name: string };
}
