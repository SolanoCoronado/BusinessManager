import {
  ArrowRight,
  BarChart3,
  FilePlus2,
  Landmark,
  PlusCircle,
  Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PRODUCT_CONFIG } from "../../../app/config/product";
import { useAuth } from "../../../app/providers/AuthProvider";
import type { ModuleId } from "../../../app/routes/moduleCatalog";
import { apiClient, ApiError } from "../../../shared/lib/apiClient";

type DashboardPageProps = {
  onNavigate: (moduleId: ModuleId) => void;
};

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  currency: "CRC",
  maximumFractionDigits: 0,
  style: "currency",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

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

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type IncomeStatementDto = { totalIncome: number; totalExpense: number; netIncome: number };
type BalanceSheetDto = { assets: Array<{ code: string; balance: number }> };
type AgingDto = { rows: Array<{ balanceDue: number }> };
type TaxSummaryDto = { totalTaxCollected: number };
type MonthPoint = { month: string; income: number; expenses: number };

type DashboardData = {
  cashBalance: number;
  monthIncome: number;
  monthExpense: number;
  netIncome: number;
  arTotal: number;
  arCount: number;
  apTotal: number;
  apCount: number;
  taxReserved: number;
  invoiceCount: number;
  expenseCount: number;
  monthlyPerformance: MonthPoint[];
};

function monthBounds(monthsAgo: number, today: Date) {
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 1));
  const to =
    monthsAgo === 0
      ? today
      : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo + 1, 0));
  return { from, to };
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function loadDashboardData(token: string): Promise<DashboardData> {
  const today = new Date();
  const monthlyRanges = Array.from({ length: 6 }, (_, i) => monthBounds(5 - i, today));
  const currentRange = monthlyRanges[5];

  const [balanceSheet, arAging, apAging, taxSummary, invoicesRes, expensesRes, ...monthlyStatements] =
    await Promise.all([
      apiClient.getReport<BalanceSheetDto>(token, "balance-sheet", { asOf: toIso(today) }),
      apiClient.getReport<AgingDto>(token, "ar-aging", { asOf: toIso(today) }),
      apiClient.getReport<AgingDto>(token, "ap-aging", { asOf: toIso(today) }),
      apiClient.getReport<TaxSummaryDto>(token, "tax-summary", {
        from: toIso(currentRange.from),
        to: toIso(currentRange.to),
      }),
      apiClient.listInvoices(token),
      apiClient.listExpenses(token),
      ...monthlyRanges.map((range) =>
        apiClient.getReport<IncomeStatementDto>(token, "income-statement", {
          from: toIso(range.from),
          to: toIso(range.to),
        }),
      ),
    ]);

  const cashBalance = balanceSheet.assets
    .filter((a) => a.code === "1010" || a.code === "1020")
    .reduce((sum, a) => sum + a.balance, 0);

  const arTotal = arAging.rows.reduce((sum, r) => sum + r.balanceDue, 0);
  const apTotal = apAging.rows.reduce((sum, r) => sum + r.balanceDue, 0);

  const monthlyPerformance = monthlyStatements.map((stmt, i) => ({
    month: MONTH_LABELS[monthlyRanges[i].from.getUTCMonth()],
    income: stmt.totalIncome / 100 / 1_000_000,
    expenses: stmt.totalExpense / 100 / 1_000_000,
  }));

  const currentStatement = monthlyStatements[5];
  const monthStart = currentRange.from;

  const invoiceCount = invoicesRes.invoices.filter(
    (inv) =>
      new Date(inv.issueDate) >= monthStart &&
      (["confirmed", "partially_paid", "paid"] as string[]).includes(inv.status),
  ).length;

  const expenseCount = expensesRes.expenses.filter(
    (exp) => new Date(exp.date) >= monthStart && exp.status === "posted",
  ).length;

  return {
    cashBalance,
    monthIncome: currentStatement.totalIncome,
    monthExpense: currentStatement.totalExpense,
    netIncome: currentStatement.netIncome,
    arTotal,
    arCount: arAging.rows.length,
    apTotal,
    apCount: apAging.rows.length,
    taxReserved: taxSummary.totalTaxCollected,
    invoiceCount,
    expenseCount,
    monthlyPerformance,
  };
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { accessToken, company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    loadDashboardData(accessToken)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo cargar el resumen.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const kpis = data
    ? [
        {
          label: "Banco y caja",
          value: formatCurrency(data.cashBalance),
          helper: "Saldo en cuentas de banco y caja",
          moduleId: "banking" as ModuleId,
        },
        {
          label: "Ingresos del mes",
          value: formatCurrency(data.monthIncome),
          helper: `${data.invoiceCount} facturas confirmadas`,
          moduleId: "invoices" as ModuleId,
        },
        {
          label: "Gastos del mes",
          value: formatCurrency(data.monthExpense),
          helper: `${data.expenseCount} gastos registrados`,
          moduleId: "expenses" as ModuleId,
        },
        {
          label: "Utilidad estimada",
          value: formatCurrency(data.netIncome),
          helper:
            data.monthIncome > 0
              ? `${((data.netIncome / data.monthIncome) * 100).toFixed(1)}% margen operativo`
              : "Sin ingresos registrados aun",
          moduleId: "reports" as ModuleId,
        },
      ]
    : [];

  const openItems = data
    ? [
        {
          label: "Cuentas por cobrar",
          value: data.arTotal,
          detail: `${data.arCount} facturas abiertas`,
        },
        {
          label: "Cuentas por pagar",
          value: data.apTotal,
          detail: `${data.apCount} cuentas por pagar abiertas`,
        },
        {
          label: "Impuesto reservado",
          value: data.taxReserved,
          detail: "Estimado del periodo",
        },
      ]
    : [];

  const maxMonthlyValue = data
    ? Math.max(1, ...data.monthlyPerformance.flatMap((month) => [month.income, month.expenses]))
    : 1;

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
                Este flujo esta pensado para {company?.displayName ?? "tu empresa"}: registrar
                facturas, gastos, pagos, bancos y asientos contables sin administrar multiples
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

        <aside className="rounded-md border border-ink-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-mint-700/15 text-mint-700">
              <Landmark aria-hidden="true" size={20} />
            </div>
            <h3 className="text-base font-semibold">Resumen fiscal</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-700">
            {PRODUCT_CONFIG.fiscalDisclaimer}
          </p>
          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
            onClick={() => onNavigate("reports")}
            type="button"
          >
            <BarChart3 aria-hidden="true" size={17} />
            Ver reportes
          </button>
        </aside>
      </section>

      {error ? (
        <section className="rounded-md border border-amberline/40 bg-white p-4 text-sm text-amberline">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-4 gap-4">
        {(loading && !data ? [0, 1, 2, 3] : kpis).map((card, index) =>
          typeof card === "number" ? (
            <div
              className="h-[104px] animate-pulse rounded-md border border-ink-100 bg-ink-50"
              key={index}
            />
          ) : (
            <button
              className="rounded-md border border-ink-100 bg-white p-5 text-left hover:border-mint-700"
              key={card.label}
              onClick={() => onNavigate(card.moduleId)}
              type="button"
            >
              <p className="text-sm text-ink-700">{card.label}</p>
              <p className="mt-3 text-xl font-semibold">{card.value}</p>
              <p className="mt-2 text-xs text-ink-700">{card.helper}</p>
            </button>
          ),
        )}
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
            {(data?.monthlyPerformance ?? []).map((month) => (
              <div className="flex h-full flex-col justify-end gap-3" key={month.month}>
                <div className="flex flex-1 items-end gap-2">
                  <div
                    aria-label={`${month.month} ingresos ${month.income.toFixed(2)} millones`}
                    className="w-full rounded-t-md bg-mint-700"
                    style={{ height: `${(month.income / maxMonthlyValue) * 100}%` }}
                  />
                  <div
                    aria-label={`${month.month} gastos ${month.expenses.toFixed(2)} millones`}
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
        </div>
      </section>
    </div>
  );
}
