const API_BASE_URL = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;

    throw new ApiError(
      body?.error?.message ?? `Error ${response.status} en ${path}`,
      response.status,
      body?.error?.code,
      body?.error?.details,
    );
  }

  return (await response.json()) as T;
}

function post<T>(path: string, payload?: unknown, token?: string) {
  const init: RequestInit = { method: "POST" };
  if (payload !== undefined) {
    init.body = JSON.stringify(payload);
  }
  return request<T>(path, init, token);
}

export type HealthResponse = {
  status: string;
  service: string;
  time: string;
};

export type Role = "admin" | "contable" | "ventas";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type CompanyProfileDto = {
  id: string;
  displayName: string;
  legalName: string | null;
  taxId: string | null;
  baseCurrency: string;
  secondaryCurrency: string | null;
  locale: string;
};

export type OnboardingInput = {
  company: {
    displayName: string;
    legalName?: string;
    taxId?: string;
    baseCurrency?: string;
    secondaryCurrency?: string;
    locale?: string;
  };
  admin: {
    name: string;
    email: string;
    password: string;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type AccountDto = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isSystem: boolean;
  active: boolean;
};

export type AccountBalanceDto = {
  account: AccountDto;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

export type CreateAccountInput = {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
};

export type JournalLineDto = {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
};

export type JournalEntryDto = {
  id: string;
  companyId: string;
  date: string;
  memo: string | null;
  status: string;
  sourceType: string;
  sourceId: string | null;
  reversalOfId: string | null;
  createdAt: string;
  lines: JournalLineDto[];
};

export type CreateJournalEntryInput = {
  date: string;
  memo?: string;
  lines: Array<{ accountId: string; debit: number; credit: number; memo?: string }>;
};

export const apiClient = {
  getHealth: () => request<HealthResponse>("/health"),

  checkCompanyExists: () => request<{ exists: boolean }>("/companies/exists"),

  getCurrentCompany: (token: string) =>
    request<{ company: CompanyProfileDto | null }>("/companies/current", undefined, token),

  onboard: (input: OnboardingInput) =>
    post<{ company: { id: string; displayName: string }; user: AuthUser; accessToken: string }>(
      "/onboarding",
      input,
    ),

  login: (input: LoginInput) =>
    post<{ user: AuthUser; accessToken: string }>("/auth/login", input),

  me: (token: string) => request<{ user: AuthUser }>("/auth/me", undefined, token),

  refresh: () => post<{ accessToken: string }>("/auth/refresh", undefined),

  logout: () => post<{ ok: boolean }>("/auth/logout", undefined),

  listAccounts: (token: string) =>
    request<{ accounts: AccountDto[] }>("/accounting/accounts", undefined, token),

  getAccountBalance: (token: string, id: string) =>
    request<AccountBalanceDto>(`/accounting/accounts/${id}`, undefined, token),

  createAccount: (token: string, input: CreateAccountInput) =>
    post<{ account: AccountDto }>("/accounting/accounts", input, token),

  listJournalEntries: (token: string) =>
    request<{ entries: JournalEntryDto[] }>("/accounting/journal-entries", undefined, token),

  createJournalEntry: (token: string, input: CreateJournalEntryInput) =>
    post<{ entry: JournalEntryDto }>("/accounting/journal-entries", input, token),

  reverseJournalEntry: (token: string, id: string) =>
    post<{ entry: JournalEntryDto }>(`/accounting/journal-entries/${id}/reverse`, undefined, token),
};
