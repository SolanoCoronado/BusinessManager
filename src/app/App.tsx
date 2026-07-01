import { useState } from "react";

import { AppLayout } from "./layouts/AppLayout";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import type { ModuleId } from "./routes/moduleCatalog";
import { AccountingPage } from "../modules/accounting/pages/AccountingPage";
import { AuditPage } from "../modules/audit/pages/AuditPage";
import { LoginPage } from "../modules/auth/pages/LoginPage";
import { OnboardingPage } from "../modules/auth/pages/OnboardingPage";
import { BackupsPage } from "../modules/backups/pages/BackupsPage";
import { BankingPage } from "../modules/banking/pages/BankingPage";
import { BillsPage } from "../modules/bills/pages/BillsPage";
import { CustomersPage } from "../modules/customers/pages/CustomersPage";
import { DashboardPage } from "../modules/dashboard/pages/DashboardPage";
import { ExpensesPage } from "../modules/expenses/pages/ExpensesPage";
import { InvoicesPage } from "../modules/invoices/pages/InvoicesPage";
import { PaymentsPage } from "../modules/payments/pages/PaymentsPage";
import { ProductsPage } from "../modules/products/pages/ProductsPage";
import { ReconciliationPage } from "../modules/reconciliation/pages/ReconciliationPage";
import { ReportsPage } from "../modules/reports/pages/ReportsPage";
import { VendorsPage } from "../modules/vendors/pages/VendorsPage";
import { ModulePlaceholderPage } from "../shared/components/ModulePlaceholderPage";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <p className="text-sm text-ink-700">Cargando...</p>
    </div>
  );
}

const MODULE_PAGES: Partial<Record<ModuleId, () => React.JSX.Element>> = {
  accounting: AccountingPage,
  customers: CustomersPage,
  vendors: VendorsPage,
  products: ProductsPage,
  invoices: InvoicesPage,
  bills: BillsPage,
  expenses: ExpensesPage,
  payments: PaymentsPage,
  banking: BankingPage,
  reconciliation: ReconciliationPage,
  reports: ReportsPage,
  audit: AuditPage,
  backups: BackupsPage,
};

function AuthenticatedApp({
  company,
  userName,
  onLogout,
}: {
  company: NonNullable<ReturnType<typeof useAuth>["company"]>;
  userName: string;
  onLogout: () => void;
}) {
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>("dashboard");
  const ModulePage = MODULE_PAGES[activeModuleId];

  return (
    <AppLayout
      activeModuleId={activeModuleId}
      company={company}
      onLogout={onLogout}
      onNavigate={setActiveModuleId}
      userName={userName}
    >
      {activeModuleId === "dashboard" ? (
        <DashboardPage onNavigate={setActiveModuleId} />
      ) : ModulePage ? (
        <ModulePage />
      ) : (
        <ModulePlaceholderPage moduleId={activeModuleId} />
      )}
    </AppLayout>
  );
}

function AppShell() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <LoadingScreen />;
  }

  if (auth.status === "needs-onboarding") {
    return <OnboardingPage />;
  }

  if (auth.status === "needs-login") {
    return <LoginPage />;
  }

  if (!auth.company || !auth.user) {
    return <LoadingScreen />;
  }

  return (
    <AuthenticatedApp company={auth.company} onLogout={() => void auth.logout()} userName={auth.user.name} />
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
