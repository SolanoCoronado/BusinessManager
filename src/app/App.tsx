import { useState } from "react";

import { AppLayout } from "./layouts/AppLayout";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import type { ModuleId } from "./routes/moduleCatalog";
import { AccountingPage } from "../modules/accounting/pages/AccountingPage";
import { LoginPage } from "../modules/auth/pages/LoginPage";
import { OnboardingPage } from "../modules/auth/pages/OnboardingPage";
import { DashboardPage } from "../modules/dashboard/pages/DashboardPage";
import { ModulePlaceholderPage } from "../shared/components/ModulePlaceholderPage";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <p className="text-sm text-ink-700">Cargando...</p>
    </div>
  );
}

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
      ) : activeModuleId === "accounting" ? (
        <AccountingPage />
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
