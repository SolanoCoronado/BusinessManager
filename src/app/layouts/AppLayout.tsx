import { Banknote, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { PRODUCT_CONFIG } from "../config/product";
import { APP_MODULES, type ModuleId } from "../routes/moduleCatalog";
import { BackendStatus } from "../../shared/components/BackendStatus";
import type { CompanyProfileDto } from "../../shared/lib/apiClient";
import { cn } from "../../shared/utils/cn";

type AppLayoutProps = {
  children: ReactNode;
  activeModuleId: ModuleId;
  company: CompanyProfileDto;
  userName: string;
  onNavigate: (moduleId: ModuleId) => void;
  onLogout: () => void;
};

export function AppLayout({
  children,
  activeModuleId,
  company,
  userName,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-ink-50 text-ink-900">
      <aside className="flex w-72 shrink-0 flex-col border-r border-ink-100 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-mint-700 text-white">
            <Banknote aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-base font-semibold">{PRODUCT_CONFIG.name}</p>
            <p className="text-xs text-ink-700">Contabilidad local</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {APP_MODULES.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeModuleId;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-ink-700 transition",
                  "hover:bg-ink-50 hover:text-ink-900",
                  isActive &&
                    "bg-mint-700 text-white hover:bg-mint-700 hover:text-white",
                )}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-6">
          <div>
            <p className="text-sm text-ink-700">Empresa activa</p>
            <h1 className="text-lg font-semibold">{company.displayName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <BackendStatus />
            <span className="text-sm text-ink-700">{userName}</span>
            <button
              className="rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
              onClick={() => onNavigate("business")}
              type="button"
            >
              Perfil del negocio
            </button>
            <button
              aria-label="Cerrar sesion"
              className="grid h-9 w-9 place-items-center rounded-md border border-ink-100 text-ink-700 hover:border-mint-700 hover:text-mint-700"
              onClick={onLogout}
              type="button"
            >
              <LogOut aria-hidden="true" size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
