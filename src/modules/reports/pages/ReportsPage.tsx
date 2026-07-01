import { BarChart3 } from "lucide-react";
import { useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { apiClient, ApiError } from "../../../shared/lib/apiClient";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

type ReportType =
  | "income-statement"
  | "balance-sheet"
  | "trial-balance"
  | "general-journal"
  | "ar-aging"
  | "ap-aging"
  | "sales-by-customer"
  | "expenses-by-category"
  | "cash-flow"
  | "tax-summary";

type Column = { key: string; label: string; format?: "cents" | "date" | "percent" | "number" };

type ReportConfig = {
  label: string;
  paramType: "range" | "asOf" | "none";
  columns: Column[];
  extractRows: (data: unknown) => Record<string, unknown>[];
};

const REPORTS: Record<ReportType, ReportConfig> = {
  "income-statement": {
    label: "Estado de resultados",
    paramType: "range",
    columns: [
      { key: "code", label: "Codigo" },
      { key: "name", label: "Cuenta" },
      { key: "type", label: "Tipo" },
      { key: "balance", label: "Monto", format: "cents" },
    ],
    extractRows: (data) => {
      const d = data as { income: unknown[]; expense: unknown[]; totalIncome: number; totalExpense: number; netIncome: number };
      return [
        ...d.income,
        { code: "", name: "TOTAL INGRESOS", type: "", balance: d.totalIncome },
        ...d.expense,
        { code: "", name: "TOTAL GASTOS", type: "", balance: d.totalExpense },
        { code: "", name: "UTILIDAD NETA", type: "", balance: d.netIncome },
      ] as Record<string, unknown>[];
    },
  },
  "balance-sheet": {
    label: "Balance general",
    paramType: "asOf",
    columns: [
      { key: "code", label: "Codigo" },
      { key: "name", label: "Cuenta" },
      { key: "type", label: "Tipo" },
      { key: "balance", label: "Monto", format: "cents" },
    ],
    extractRows: (data) => {
      const d = data as { assets: unknown[]; liabilities: unknown[]; equity: unknown[]; netIncome: number; totalAssets: number; totalLiabilities: number; totalEquity: number };
      return [
        ...d.assets,
        { code: "", name: "TOTAL ACTIVO", type: "", balance: d.totalAssets },
        ...d.liabilities,
        ...d.equity,
        { code: "", name: "Utilidad del periodo", type: "equity", balance: d.netIncome },
        { code: "", name: "TOTAL PASIVO + PATRIMONIO", type: "", balance: d.totalLiabilities + d.totalEquity },
      ] as Record<string, unknown>[];
    },
  },
  "trial-balance": {
    label: "Balance de comprobacion",
    paramType: "asOf",
    columns: [
      { key: "code", label: "Codigo" },
      { key: "name", label: "Cuenta" },
      { key: "debit", label: "Debe", format: "cents" },
      { key: "credit", label: "Haber", format: "cents" },
    ],
    extractRows: (data) => {
      const d = data as { rows: unknown[]; totalDebit: number; totalCredit: number };
      return [
        ...d.rows,
        { code: "", name: "TOTALES", debit: d.totalDebit, credit: d.totalCredit },
      ] as Record<string, unknown>[];
    },
  },
  "general-journal": {
    label: "Libro diario",
    paramType: "range",
    columns: [
      { key: "date", label: "Fecha", format: "date" },
      { key: "memo", label: "Descripcion" },
      { key: "totalDebit", label: "Debe", format: "cents" },
      { key: "totalCredit", label: "Haber", format: "cents" },
    ],
    extractRows: (data) => {
      const entries = (data as { entries: Array<{ date: string; memo: string | null; lines: Array<{ debit: number; credit: number }> }> }).entries;
      return entries.map((e) => ({
        date: e.date,
        memo: e.memo ?? "-",
        totalDebit: e.lines.reduce((s, l) => s + l.debit, 0),
        totalCredit: e.lines.reduce((s, l) => s + l.credit, 0),
      }));
    },
  },
  "ar-aging": {
    label: "Antiguedad CxC",
    paramType: "asOf",
    columns: [
      { key: "number", label: "Factura" },
      { key: "customerName", label: "Cliente" },
      { key: "daysOutstanding", label: "Dias", format: "number" },
      { key: "bucket", label: "Rango" },
      { key: "balanceDue", label: "Saldo", format: "cents" },
    ],
    extractRows: (data) => (data as { rows: Record<string, unknown>[] }).rows,
  },
  "ap-aging": {
    label: "Antiguedad CxP",
    paramType: "asOf",
    columns: [
      { key: "number", label: "Cuenta x Pagar" },
      { key: "vendorName", label: "Proveedor" },
      { key: "daysOutstanding", label: "Dias", format: "number" },
      { key: "bucket", label: "Rango" },
      { key: "balanceDue", label: "Saldo", format: "cents" },
    ],
    extractRows: (data) => (data as { rows: Record<string, unknown>[] }).rows,
  },
  "sales-by-customer": {
    label: "Ventas por cliente",
    paramType: "range",
    columns: [
      { key: "customerName", label: "Cliente" },
      { key: "count", label: "Facturas", format: "number" },
      { key: "total", label: "Total", format: "cents" },
    ],
    extractRows: (data) => (data as { rows: Record<string, unknown>[] }).rows,
  },
  "expenses-by-category": {
    label: "Gastos por categoria",
    paramType: "range",
    columns: [
      { key: "accountName", label: "Categoria" },
      { key: "count", label: "Registros", format: "number" },
      { key: "total", label: "Total", format: "cents" },
    ],
    extractRows: (data) => (data as { rows: Record<string, unknown>[] }).rows,
  },
  "cash-flow": {
    label: "Flujo de caja",
    paramType: "range",
    columns: [
      { key: "code", label: "Cuenta" },
      { key: "name", label: "Nombre" },
      { key: "inflows", label: "Entradas", format: "cents" },
      { key: "outflows", label: "Salidas", format: "cents" },
      { key: "netChange", label: "Neto", format: "cents" },
    ],
    extractRows: (data) => {
      const d = data as { flows: unknown[]; totalNetChange: number };
      return [
        ...d.flows,
        { code: "", name: "CAMBIO NETO TOTAL", inflows: 0, outflows: 0, netChange: d.totalNetChange },
      ] as Record<string, unknown>[];
    },
  },
  "tax-summary": {
    label: "Resumen de impuestos",
    paramType: "range",
    columns: [
      { key: "name", label: "Impuesto" },
      { key: "rate", label: "Tasa", format: "percent" },
      { key: "baseAmount", label: "Base imponible", format: "cents" },
      { key: "taxAmount", label: "Impuesto cobrado", format: "cents" },
    ],
    extractRows: (data) => {
      const d = data as { rows: unknown[]; totalTaxCollected: number };
      return [
        ...d.rows,
        { name: "TOTAL", rate: 0, baseAmount: 0, taxAmount: d.totalTaxCollected },
      ] as Record<string, unknown>[];
    },
  },
};

function formatCell(value: unknown, format?: string) {
  if (value === null || value === undefined) return "-";
  const asString: string = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
  if (format === "cents") return formatCents(Number(value));
  if (format === "date") return new Date(asString).toLocaleDateString("es-CR");
  if (format === "percent") return `${Number(value).toFixed(2)}%`;
  if (format === "number") return asString;
  return asString;
}

function exportCsv(
  columns: Column[],
  rows: Record<string, unknown>[],
  filename: string,
) {
  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) => columns.map((c) => `"${formatCell(row[c.key], c.format)}"`).join(","));
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { accessToken } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("income-statement");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [asOf, setAsOf] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const config = REPORTS[reportType];

  async function onGenerate() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {};
      if (config.paramType === "range") {
        if (from) params.from = from;
        if (to) params.to = to;
      } else if (config.paramType === "asOf") {
        if (asOf) params.asOf = asOf;
      }

      const data = await apiClient.getReport(accessToken, reportType, params);
      setRows(config.extractRows(data));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <BarChart3 aria-hidden="true" size={24} />
          </div>
          <h2 className="text-2xl font-semibold text-ink-900">Reportes</h2>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <select
            className="col-span-2 rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => {
              setReportType(e.target.value as ReportType);
              setRows([]);
            }}
            value={reportType}
          >
            {(Object.entries(REPORTS) as [ReportType, ReportConfig][]).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          {config.paramType === "range" ? (
            <>
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Desde"
                type="date"
                value={from}
              />
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setTo(e.target.value)}
                placeholder="Hasta"
                type="date"
                value={to}
              />
            </>
          ) : config.paramType === "asOf" ? (
            <input
              className="col-span-2 rounded-md border border-ink-100 px-3 py-2 text-sm"
              onChange={(e) => setAsOf(e.target.value)}
              placeholder="Al dia"
              type="date"
              value={asOf}
            />
          ) : null}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            className="rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={loading}
            onClick={() => void onGenerate()}
            type="button"
          >
            {loading ? "Generando..." : "Generar reporte"}
          </button>

          {rows.length > 0 ? (
            <button
              className="rounded-md border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 hover:border-mint-700"
              onClick={() => exportCsv(config.columns, rows, `${reportType}.csv`)}
              type="button"
            >
              Exportar CSV
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {rows.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                {config.columns.map((col) => (
                  <th className="px-4 py-2 first:rounded-tl-md last:rounded-tr-md" key={col.key}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={!row.code && !row.id ? "bg-ink-50 font-semibold text-ink-900" : ""}
                >
                  {config.columns.map((col) => (
                    <td className="px-4 py-2" key={col.key}>
                      {formatCell(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
