import { ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiClient,
  ApiError,
  type AccountDto,
  type ExpenseDto,
  type PartyDto,
} from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesPage() {
  const { accessToken } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountDto[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<AccountDto[]>([]);
  const [vendors, setVendors] = useState<PartyDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [paidFromAccountId, setPaidFromAccountId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load(token: string) {
    try {
      const [expensesRes, accountsRes, vendorsRes] = await Promise.all([
        apiClient.listExpenses(token),
        apiClient.listAccounts(token),
        apiClient.listVendors(token),
      ]);
      setExpenses(expensesRes.expenses);
      setExpenseAccounts(accountsRes.accounts.filter((a) => a.type === "expense" && a.parentId));
      setPaymentAccounts(
        accountsRes.accounts.filter((a) => a.code === "1010" || a.code === "1020"),
      );
      setVendors(vendorsRes.vendors);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar los gastos.");
    }
  }

  useEffect(() => {
    if (accessToken) void load(accessToken);
  }, [accessToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !accountId || !paidFromAccountId || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.createExpense(accessToken, {
        accountId,
        paidFromAccountId,
        vendorId: vendorId || undefined,
        amount: Math.round(Number(amount) * 100),
        date,
        memo: memo || undefined,
      });
      setAmount("");
      setMemo("");
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el gasto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVoid(id: string) {
    if (!accessToken) return;
    try {
      await apiClient.voidExpense(accessToken, id);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo anular el gasto.");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Registrar gasto pagado</h2>
        <form className="mt-4 grid grid-cols-3 gap-3" onSubmit={(e) => void onSubmit(e)}>
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setAccountId(e.target.value)}
            value={accountId}
          >
            <option value="">Cuenta de gasto</option>
            {expenseAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setPaidFromAccountId(e.target.value)}
            value={paidFromAccountId}
          >
            <option value="">Pagado desde</option>
            {paymentAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setVendorId(e.target.value)}
            value={vendorId}
          >
            <option value="">Proveedor (opcional)</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto"
            step="0.01"
            type="number"
            value={amount}
          />
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setDate(e.target.value)}
            type="date"
            value={date}
          />
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Memo (opcional)"
            type="text"
            value={memo}
          />

          {error ? <p className="col-span-3 text-sm text-amberline">{error}</p> : null}

          <button
            className="col-span-3 w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Guardando..." : "Registrar gasto"}
          </button>
        </form>
      </section>

      {expenses.length === 0 ? (
        <EmptyState
          description="Registra tu primer gasto con el formulario de arriba."
          icon={ReceiptText}
          title="Todavia no hay gastos registrados"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Memo</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-2">{new Date(expense.date).toLocaleDateString("es-CR")}</td>
                  <td className="px-4 py-2 text-ink-700">{expense.memo || "-"}</td>
                  <td className="px-4 py-2 text-ink-700">
                    {expense.status === "void" ? "Anulado" : "Registrado"}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCents(expense.amount)}</td>
                  <td className="px-4 py-2 text-right">
                    {expense.status !== "void" ? (
                      <button
                        className="text-xs font-semibold text-ink-700 hover:text-amberline"
                        onClick={() => void onVoid(expense.id)}
                        type="button"
                      >
                        Anular
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
