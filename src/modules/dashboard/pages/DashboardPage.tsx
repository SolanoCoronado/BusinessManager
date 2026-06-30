import {
  ArrowRight,
  BarChart3,
  FilePlus2,
  Landmark,
  PackageCheck,
  PlusCircle,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { PRODUCT_CONFIG } from "../../../app/config/product";
import type { ModuleId } from "../../../app/routes/moduleCatalog";

type DashboardPageProps = {
  onNavigate: (moduleId: ModuleId) => void;
};

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  currency: "CRC",
  maximumFractionDigits: 0,
  style: "currency",
});

const quickActions = [
  { label: "Factura", icon: FilePlus2, moduleId: "invoices" },
  { label: "Gasto", icon: Receipt, moduleId: "expenses" },
  { label: "Cobro", icon: Landmark, moduleId: "payments" },
  { label: "Asiento", icon: PlusCircle, moduleId: "accounting" },
] satisfies Array<{
  label: string;
  icon: typeof FilePlus2;
  moduleId: ModuleId;
}>;

const kpis = [
  {
    label: "Banco y caja",
    value: 18425000,
    helper: "+8.4% vs mes anterior",
    moduleId: "banking",
  },
  {
    label: "Ingresos del mes",
    value: 32780000,
    helper: "42 facturas emitidas",
    moduleId: "invoices",
  },
  {
    label: "Gastos del mes",
    value: 21940000,
    helper: "64% costo de inventario",
    moduleId: "expenses",
  },
  {
    label: "Utilidad estimada",
    value: 10840000,
    helper: "33.1% margen operativo",
    moduleId: "reports",
  },
] satisfies Array<{
  label: string;
  value: number;
  helper: string;
  moduleId: ModuleId;
}>;

const monthlyPerformance = [
  { month: "Ene", income: 23.4, expenses: 18.2 },
  { month: "Feb", income: 25.1, expenses: 17.9 },
  { month: "Mar", income: 28.7, expenses: 20.8 },
  { month: "Abr", income: 26.9, expenses: 19.4 },
  { month: "May", income: 31.2, expenses: 21.1 },
  { month: "Jun", income: 32.8, expenses: 21.9 },
];

const purchaseForecast = [
  {
    sku: "WKD-CAFE-1KG",
    name: "Cafe premium 1 kg",
    stock: 42,
    dailyDemand: 8,
    leadTimeDays: 6,
    safetyStock: 18,
    supplier: "Distribuidora Central",
  },
  {
    sku: "WKD-FILTRO-100",
    name: "Filtros paquete 100",
    stock: 130,
    dailyDemand: 19,
    leadTimeDays: 4,
    safetyStock: 35,
    supplier: "Insumos del Oeste",
  },
  {
    sku: "WKD-VASO-12OZ",
    name: "Vasos 12 oz",
    stock: 210,
    dailyDemand: 36,
    leadTimeDays: 5,
    safetyStock: 80,
    supplier: "Empaques CR",
  },
] satisfies Array<{
  sku: string;
  name: string;
  stock: number;
  dailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  supplier: string;
}>;

const openItems = [
  { label: "Cuentas por cobrar", value: 6850000, detail: "9 facturas abiertas" },
  { label: "Cuentas por pagar", value: 4130000, detail: "6 vencen esta semana" },
  { label: "Impuesto reservado", value: 2210000, detail: "Estimado del periodo" },
];

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getForecast(item: (typeof purchaseForecast)[number]) {
  const reorderPoint = item.dailyDemand * item.leadTimeDays + item.safetyStock;
  const daysOnHand = Math.floor(item.stock / item.dailyDemand);
  const suggestedOrder = Math.max(reorderPoint * 2 - item.stock, 0);

  return { daysOnHand, reorderPoint, suggestedOrder };
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const maxMonthlyValue = Math.max(
    ...monthlyPerformance.flatMap((month) => [month.income, month.expenses]),
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="grid grid-cols-[1fr_320px] gap-6">
        <div className="rounded-md border border-ink-100 bg-white p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-mint-700">
                Operacion de una sola empresa
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-900">
                Contabilidad, ventas e inventario en un solo tablero
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
                Este flujo esta pensado para WKD PRODUCTS: registrar facturas,
                gastos, pagos, bancos y asientos contables sin administrar multiples
                companias.
              </p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ink-900 text-white">
              <BarChart3 aria-hidden="true" size={24} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  className="flex h-24 flex-col items-start justify-between rounded-md border border-ink-100 bg-ink-50 p-4 text-left text-sm font-semibold text-ink-800 hover:border-mint-700 hover:bg-white"
                  key={action.label}
                  onClick={() => onNavigate(action.moduleId)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={20} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-md border border-amberline/40 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-amberline/15 text-amberline">
              <TrendingUp aria-hidden="true" size={20} />
            </div>
            <h3 className="text-base font-semibold">Prediccion activa</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            La sugerencia de pedidos combina inventario disponible, venta diaria,
            tiempo de entrega y stock de seguridad.
          </p>
          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
            onClick={() => onNavigate("products")}
            type="button"
          >
            <ShoppingCart aria-hidden="true" size={17} />
            Revisar inventario
          </button>
        </aside>
      </section>

      <section className="grid grid-cols-4 gap-4">
        {kpis.map((card) => (
          <button
            className="rounded-md border border-ink-100 bg-white p-5 text-left hover:border-mint-700"
            key={card.label}
            onClick={() => onNavigate(card.moduleId)}
            type="button"
          >
            <p className="text-sm text-ink-700">{card.label}</p>
            <p className="mt-3 text-xl font-semibold">{formatCurrency(card.value)}</p>
            <p className="mt-2 text-xs text-ink-700">{card.helper}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-[1fr_360px] gap-6">
        <div className="rounded-md border border-ink-100 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Ingresos vs gastos</h3>
              <p className="mt-1 text-sm text-ink-700">Millones de colones por mes</p>
            </div>
            <button
              className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-800 hover:border-mint-700"
              onClick={() => onNavigate("reports")}
              type="button"
            >
              Reportes
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </div>

          <div className="mt-6 grid h-64 grid-cols-6 items-end gap-5 border-b border-ink-100 pb-4">
            {monthlyPerformance.map((month) => (
              <div className="flex h-full flex-col justify-end gap-3" key={month.month}>
                <div className="flex flex-1 items-end gap-2">
                  <div
                    aria-label={`${month.month} ingresos ${month.income} millones`}
                    className="w-full rounded-t-md bg-mint-700"
                    style={{ height: `${(month.income / maxMonthlyValue) * 100}%` }}
                  />
                  <div
                    aria-label={`${month.month} gastos ${month.expenses} millones`}
                    className="w-full rounded-t-md bg-amberline"
                    style={{ height: `${(month.expenses / maxMonthlyValue) * 100}%` }}
                  />
                </div>
                <p className="text-center text-xs font-medium text-ink-700">
                  {month.month}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-5 text-xs text-ink-700">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-mint-700" />
              Ingresos
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-amberline" />
              Gastos
            </span>
          </div>
        </div>

        <div className="rounded-md border border-ink-100 bg-white p-6">
          <h3 className="text-base font-semibold">Pendientes clave</h3>
          <div className="mt-5 flex flex-col divide-y divide-ink-100">
            {openItems.map((item) => (
              <div className="py-4 first:pt-0 last:pb-0" key={item.label}>
                <p className="text-sm text-ink-700">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(item.value)}</p>
                <p className="mt-1 text-xs text-ink-700">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-md bg-ink-50 p-3 text-xs leading-5 text-ink-700">
            {PRODUCT_CONFIG.fiscalDisclaimer}
          </p>
        </div>
      </section>

      <section className="rounded-md border border-ink-100 bg-white">
        <div className="flex items-center justify-between border-b border-ink-100 p-6">
          <div>
            <h3 className="text-base font-semibold">Pedidos sugeridos</h3>
            <p className="mt-1 text-sm text-ink-700">
              Basado en rotacion, tiempo de entrega y stock de seguridad.
            </p>
          </div>
          <PackageCheck aria-hidden="true" className="text-mint-700" size={24} />
        </div>

        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] border-b border-ink-100 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-ink-700">
          <span>Producto</span>
          <span>Stock</span>
          <span>Dias</span>
          <span>Pedir</span>
          <span>Proveedor</span>
        </div>

        {purchaseForecast.map((item) => {
          const forecast = getForecast(item);
          const isUrgent = item.stock <= forecast.reorderPoint;

          return (
            <div
              className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] items-center border-b border-ink-100 px-6 py-4 last:border-b-0"
              key={item.sku}
            >
              <div>
                <p className="font-semibold text-ink-900">{item.name}</p>
                <p className="mt-1 text-xs text-ink-700">{item.sku}</p>
              </div>
              <span className="text-sm text-ink-800">{item.stock} uds</span>
              <span className="text-sm text-ink-800">{forecast.daysOnHand} dias</span>
              <span className="text-sm font-semibold text-ink-900">
                {forecast.suggestedOrder} uds
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-800">{item.supplier}</span>
                <span
                  className={
                    isUrgent
                      ? "rounded-md bg-amberline/15 px-2 py-1 text-xs font-semibold text-ink-900"
                      : "rounded-md bg-ink-50 px-2 py-1 text-xs font-semibold text-ink-700"
                  }
                >
                  {isUrgent ? "Comprar" : "Vigilar"}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
