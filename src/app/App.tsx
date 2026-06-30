import { useState } from "react";

import { DEFAULT_COMPANY_PROFILE } from "./config/companyProfile";
import { AppLayout } from "./layouts/AppLayout";
import type { ModuleId } from "./routes/moduleCatalog";
import { DashboardPage } from "../modules/dashboard/pages/DashboardPage";
import { ModulePlaceholderPage } from "../shared/components/ModulePlaceholderPage";

export function App() {
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>("dashboard");

  return (
    <AppLayout
      activeModuleId={activeModuleId}
      company={DEFAULT_COMPANY_PROFILE}
      onNavigate={setActiveModuleId}
    >
      {activeModuleId === "dashboard" ? (
        <DashboardPage onNavigate={setActiveModuleId} />
      ) : (
        <ModulePlaceholderPage moduleId={activeModuleId} />
      )}
    </AppLayout>
  );
}
