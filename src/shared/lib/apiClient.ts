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

function patch<T>(path: string, payload: unknown, token?: string) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(payload) }, token);
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

export type PartyDto = {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTermsDays: number;
  currency: string;
  defaultAccountId: string | null;
  active: boolean;
};

export type CreatePartyInput = {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTermsDays?: number;
  currency?: string;
  defaultAccountId?: string;
};

export type TaxRateDto = {
  id: string;
  name: string;
  rate: number;
  accountId: string | null;
  active: boolean;
};

export type CreateTaxRateInput = {
  name: string;
  rate: number;
  accountId?: string;
};

export type ProductType = "product" | "service";

export type ProductDto = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  unitPrice: number;
  taxRateId: string | null;
  trackInventory: boolean;
  stockQuantity: number;
  incomeAccountId: string | null;
  expenseAccountId: string | null;
  active: boolean;
};

export type CreateProductInput = {
  sku: string;
  name: string;
  type: ProductType;
  unitPrice: number;
  taxRateId?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  incomeAccountId?: string;
  expenseAccountId?: string;
};

export type InvoiceStatus = "draft" | "confirmed" | "partially_paid" | "paid" | "void";

export type InvoiceLineDto = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string | null;
  lineTotal: number;
  taxAmount: number;
};

export type InvoiceDto = {
  id: string;
  customerId: string;
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  memo: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  balanceDue: number;
  lines: InvoiceLineDto[];
  customer?: PartyDto;
};

export type CreateInvoiceInput = {
  customerId: string;
  issueDate: string;
  dueDate?: string;
  memo?: string;
  lines: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRateId?: string;
  }>;
};

export type BillStatus = "draft" | "confirmed" | "partially_paid" | "paid" | "void";

export type BillLineDto = {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  accountId: string | null;
  lineTotal: number;
};

export type BillDto = {
  id: string;
  vendorId: string;
  number: string;
  issueDate: string;
  dueDate: string | null;
  status: BillStatus;
  memo: string | null;
  total: number;
  balanceDue: number;
  lines: BillLineDto[];
  vendor?: PartyDto;
};

export type CreateBillInput = {
  vendorId: string;
  issueDate: string;
  dueDate?: string;
  memo?: string;
  lines: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    accountId?: string;
  }>;
};

export type PaymentDto = {
  id: string;
  type: "customer" | "vendor";
  invoiceId: string | null;
  billId: string | null;
  amount: number;
  date: string;
  method: string;
  accountId: string;
  memo: string | null;
};

export type CreatePaymentInput = {
  type: "customer" | "vendor";
  invoiceId?: string;
  billId?: string;
  amount: number;
  date: string;
  method?: "cash" | "bank_transfer" | "card" | "other";
  accountId: string;
  memo?: string;
};

export type ExpenseDto = {
  id: string;
  vendorId: string | null;
  accountId: string;
  paidFromAccountId: string;
  amount: number;
  date: string;
  memo: string | null;
  status: "posted" | "void";
};

export type CreateExpenseInput = {
  vendorId?: string;
  accountId: string;
  paidFromAccountId: string;
  amount: number;
  date: string;
  memo?: string;
};

export type BankAccountDto = {
  id: string;
  name: string;
  accountId: string;
  currency: string;
  openingBalance: number;
  active: boolean;
  account?: AccountDto;
};

export type CreateBankAccountInput = {
  name: string;
  accountId: string;
  currency?: string;
  openingBalance?: number;
};

export type BankTransactionStatus = "pending" | "matched" | "reconciled" | "ignored";

export type BankTransactionDto = {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  amount: number;
  status: BankTransactionStatus;
  reconciliationId: string | null;
  importBatchId: string | null;
};

export type CreateBankTransactionInput = {
  date: string;
  description: string;
  amount: number;
};

export type ImportTransactionsInput = {
  rows: Array<{ date: string; description: string; amount: number }>;
};

export type ReconciliationDto = {
  id: string;
  bankAccountId: string;
  periodEnd: string;
  statementEndingBalance: number;
  status: "in_progress" | "completed";
  bookBalance: number | null;
  difference: number | null;
  completedAt: string | null;
};

export type StartReconciliationInput = {
  bankAccountId: string;
  periodEnd: string;
  statementEndingBalance: number;
};

export type AuditLogDto = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
};

export type BackupDto = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

function reportUrl(name: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const q = search.toString();
  return `/reports/${name}${q ? `?${q}` : ""}`;
}

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

  updateCompany: (token: string, input: Partial<CompanyProfileDto>) =>
    patch<{ company: CompanyProfileDto }>("/companies/current", input, token),

  listCustomers: (token: string) =>
    request<{ customers: PartyDto[] }>("/customers", undefined, token),

  createCustomer: (token: string, input: CreatePartyInput) =>
    post<{ customer: PartyDto }>("/customers", input, token),

  setCustomerActive: (token: string, id: string, active: boolean) =>
    patch<{ customer: PartyDto }>(`/customers/${id}/active`, { active }, token),

  listVendors: (token: string) => request<{ vendors: PartyDto[] }>("/vendors", undefined, token),

  createVendor: (token: string, input: CreatePartyInput) =>
    post<{ vendor: PartyDto }>("/vendors", input, token),

  setVendorActive: (token: string, id: string, active: boolean) =>
    patch<{ vendor: PartyDto }>(`/vendors/${id}/active`, { active }, token),

  listTaxRates: (token: string) =>
    request<{ taxRates: TaxRateDto[] }>("/tax-rates", undefined, token),

  createTaxRate: (token: string, input: CreateTaxRateInput) =>
    post<{ taxRate: TaxRateDto }>("/tax-rates", input, token),

  listProducts: (token: string) =>
    request<{ products: ProductDto[] }>("/products", undefined, token),

  createProduct: (token: string, input: CreateProductInput) =>
    post<{ product: ProductDto }>("/products", input, token),

  setProductActive: (token: string, id: string, active: boolean) =>
    patch<{ product: ProductDto }>(`/products/${id}/active`, { active }, token),

  listInvoices: (token: string) =>
    request<{ invoices: InvoiceDto[] }>("/invoices", undefined, token),

  getInvoice: (token: string, id: string) =>
    request<{ invoice: InvoiceDto }>(`/invoices/${id}`, undefined, token),

  createInvoice: (token: string, input: CreateInvoiceInput) =>
    post<{ invoice: InvoiceDto }>("/invoices", input, token),

  confirmInvoice: (token: string, id: string) =>
    post<{ invoice: InvoiceDto }>(`/invoices/${id}/confirm`, undefined, token),

  voidInvoice: (token: string, id: string) =>
    post<{ invoice: InvoiceDto }>(`/invoices/${id}/void`, undefined, token),

  listBills: (token: string) => request<{ bills: BillDto[] }>("/bills", undefined, token),

  createBill: (token: string, input: CreateBillInput) =>
    post<{ bill: BillDto }>("/bills", input, token),

  confirmBill: (token: string, id: string) =>
    post<{ bill: BillDto }>(`/bills/${id}/confirm`, undefined, token),

  voidBill: (token: string, id: string) =>
    post<{ bill: BillDto }>(`/bills/${id}/void`, undefined, token),

  listPayments: (token: string) =>
    request<{ payments: PaymentDto[] }>("/payments", undefined, token),

  createPayment: (token: string, input: CreatePaymentInput) =>
    post<{ payment: PaymentDto }>("/payments", input, token),

  listExpenses: (token: string) =>
    request<{ expenses: ExpenseDto[] }>("/expenses", undefined, token),

  createExpense: (token: string, input: CreateExpenseInput) =>
    post<{ expense: ExpenseDto }>("/expenses", input, token),

  voidExpense: (token: string, id: string) =>
    post<{ expense: ExpenseDto }>(`/expenses/${id}/void`, undefined, token),

  listBankAccounts: (token: string) =>
    request<{ bankAccounts: BankAccountDto[] }>("/banking/bank-accounts", undefined, token),

  createBankAccount: (token: string, input: CreateBankAccountInput) =>
    post<{ bankAccount: BankAccountDto }>("/banking/bank-accounts", input, token),

  listBankTransactions: (token: string, bankAccountId: string, status?: string) =>
    request<{ transactions: BankTransactionDto[] }>(
      `/banking/bank-accounts/${bankAccountId}/transactions${status ? `?status=${status}` : ""}`,
      undefined,
      token,
    ),

  createBankTransaction: (token: string, bankAccountId: string, input: CreateBankTransactionInput) =>
    post<{ transaction: BankTransactionDto }>(
      `/banking/bank-accounts/${bankAccountId}/transactions`,
      input,
      token,
    ),

  importBankTransactions: (token: string, bankAccountId: string, input: ImportTransactionsInput) =>
    post<{ imported: number; skippedDuplicates: number }>(
      `/banking/bank-accounts/${bankAccountId}/import`,
      input,
      token,
    ),

  listReconciliations: (token: string, bankAccountId: string) =>
    request<{ reconciliations: ReconciliationDto[] }>(
      `/banking/bank-accounts/${bankAccountId}/reconciliations`,
      undefined,
      token,
    ),

  startReconciliation: (token: string, input: StartReconciliationInput) =>
    post<{ reconciliation: ReconciliationDto }>("/banking/reconciliations", input, token),

  setTransactionMatched: (token: string, reconciliationId: string, transactionId: string, matched: boolean) =>
    patch<{ transaction: BankTransactionDto }>(
      `/banking/reconciliations/${reconciliationId}/transactions/${transactionId}`,
      { matched },
      token,
    ),

  completeReconciliation: (token: string, id: string) =>
    post<{ reconciliation: ReconciliationDto }>(`/banking/reconciliations/${id}/complete`, undefined, token),

  getReport: <T>(token: string, name: string, params: Record<string, string | undefined>) =>
    request<T>(reportUrl(name, params), undefined, token),

  listAuditLogs: (token: string, limit?: number) =>
    request<{ logs: AuditLogDto[] }>(`/audit-logs${limit ? `?limit=${limit}` : ""}`, undefined, token),

  listBackups: (token: string) => request<{ backups: BackupDto[] }>("/backups", undefined, token),

  createBackup: (token: string) => post<{ backup: BackupDto }>("/backups", undefined, token),

  restoreBackup: (token: string, filename: string) =>
    post<{ restoredFrom: string; preRestoreSnapshot: string }>(
      `/backups/${encodeURIComponent(filename)}/restore`,
      undefined,
      token,
    ),
};
