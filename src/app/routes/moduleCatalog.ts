import {
  Archive,
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "dashboard"
  | "business"
  | "customers"
  | "vendors"
  | "products"
  | "invoices"
  | "expenses"
  | "bills"
  | "payments"
  | "banking"
  | "accounting"
  | "reconciliation"
  | "reports"
  | "audit"
  | "backups"
  | "settings";

export type AppModule = {
  id: ModuleId;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
};

export const APP_MODULES: AppModule[] = [
  {
    id: "dashboard",
    label: "Inicio",
    title: "Dashboard",
    description: "Vista ejecutiva de saldos, ingresos, gastos y tareas pendientes.",
    icon: Home,
    phase: "Fase 0",
  },
  {
    id: "business",
    label: "Negocio",
    title: "Perfil del negocio",
    description: "Datos fiscales, moneda, periodos contables y preferencias de una sola empresa.",
    icon: Building2,
    phase: "Fase 1",
  },
  {
    id: "customers",
    label: "Clientes",
    title: "Clientes",
    description: "Clientes, saldos pendientes e historial de documentos.",
    icon: Users,
    phase: "Fase 3",
  },
  {
    id: "vendors",
    label: "Proveedores",
    title: "Proveedores",
    description: "Proveedores, cuentas por pagar e historial de compras.",
    icon: Users,
    phase: "Fase 3",
  },
  {
    id: "products",
    label: "Productos",
    title: "Productos y servicios",
    description: "Catalogo comercial con cuentas contables e impuestos asociados.",
    icon: Package,
    phase: "Fase 3",
  },
  {
    id: "invoices",
    label: "Facturas",
    title: "Facturas",
    description: "Cotizaciones, facturas, estados, pagos y PDF local.",
    icon: FileText,
    phase: "Fase 4",
  },
  {
    id: "expenses",
    label: "Gastos",
    title: "Gastos",
    description: "Gastos pagados, clasificacion contable e impuestos.",
    icon: ReceiptText,
    phase: "Fase 4",
  },
  {
    id: "bills",
    label: "Cuentas por pagar",
    title: "Cuentas por pagar",
    description: "Facturas de proveedor, vencimientos y pagos parciales.",
    icon: ClipboardList,
    phase: "Fase 4",
  },
  {
    id: "payments",
    label: "Cobros y pagos",
    title: "Cobros y pagos",
    description: "Aplicacion de pagos, cobros parciales e ingresos no facturados.",
    icon: Banknote,
    phase: "Fase 4",
  },
  {
    id: "banking",
    label: "Bancos",
    title: "Banco y caja",
    description: "Cuentas locales, movimientos manuales e importacion CSV.",
    icon: Landmark,
    phase: "Fase 5",
  },
  {
    id: "accounting",
    label: "Contabilidad",
    title: "Contabilidad",
    description: "Catalogo de cuentas, diario general, asientos y reversos.",
    icon: BookOpen,
    phase: "Fase 2",
  },
  {
    id: "reconciliation",
    label: "Conciliacion",
    title: "Conciliacion bancaria",
    description: "Comparacion contra saldo bancario, diferencias y cierre auditable.",
    icon: ClipboardList,
    phase: "Fase 5",
  },
  {
    id: "reports",
    label: "Reportes",
    title: "Reportes",
    description: "Estados financieros, libros contables y exportaciones locales.",
    icon: BarChart3,
    phase: "Fase 6",
  },
  {
    id: "audit",
    label: "Auditoria",
    title: "Auditoria",
    description: "Eventos importantes, cambios de permisos y trazabilidad local.",
    icon: ShieldCheck,
    phase: "Fase 7",
  },
  {
    id: "backups",
    label: "Respaldos",
    title: "Respaldos",
    description: "Backups locales, validacion y restauracion controlada.",
    icon: Archive,
    phase: "Fase 7",
  },
  {
    id: "settings",
    label: "Configuracion",
    title: "Configuracion",
    description: "Preferencias regionales, impuestos, seguridad y advertencias.",
    icon: Settings,
    phase: "Fase 1",
  },
];

export function getModuleById(moduleId: ModuleId) {
  return APP_MODULES.find((module) => module.id === moduleId) ?? APP_MODULES[0];
}
