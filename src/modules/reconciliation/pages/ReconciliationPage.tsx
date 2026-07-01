import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiClient,
  ApiError,
  type BankAccountDto,
  type BankTransactionDto,
  type ReconciliationDto,
} from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

export function ReconciliationPage() {
  const { accessToken } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reconciliations, setReconciliations] = useState<ReconciliationDto[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<BankTransactionDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState("");

  const activeReconciliation = reconciliations.find((r) => r.status === "in_progress");

  async function loadBankAccounts(token: string) {
    try {
      const res = await apiClient.listBankAccounts(token);
      setBankAccounts(res.bankAccounts);
      if (!selectedId && res.bankAccounts[0]) {
        setSelectedId(res.bankAccounts[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar las cuentas bancarias.");
    }
  }

  async function loadReconciliationData(token: string, bankAccountId: string) {
    try {
      const [reconciliationsRes, transactionsRes] = await Promise.all([
        apiClient.listReconciliations(token, bankAccountId),
        apiClient.listBankTransactions(token, bankAccountId),
      ]);
      setReconciliations(reconciliationsRes.reconciliations);
      setPendingTransactions(
        transactionsRes.transactions.filter((t) => t.status === "pending" || t.status === "matched"),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la conciliacion.");
    }
  }

  useEffect(() => {
    if (accessToken) void loadBankAccounts(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && selectedId) void loadReconciliationData(accessToken, selectedId);
  }, [accessToken, selectedId]);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedId || !statementBalance) return;
    setError(null);
    try {
      await apiClient.startReconciliation(accessToken, {
        bankAccountId: selectedId,
        periodEnd,
        statementEndingBalance: Math.round(Number(statementBalance) * 100),
      });
      setStatementBalance("");
      await loadReconciliationData(accessToken, selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar la conciliacion.");
    }
  }

  async function onToggleMatch(transactionId: string, matched: boolean) {
    if (!accessToken || !activeReconciliation) return;
    try {
      await apiClient.setTransactionMatched(accessToken, activeReconciliation.id, transactionId, matched);
      await loadReconciliationData(accessToken, selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el movimiento.");
    }
  }

  async function onComplete() {
    if (!accessToken || !activeReconciliation) return;
    try {
      await apiClient.completeReconciliation(accessToken, activeReconciliation.id);
      await loadReconciliationData(accessToken, selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la conciliacion.");
    }
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          description="Crea una cuenta bancaria en el modulo Bancos antes de conciliar."
          icon={ClipboardList}
          title="No hay cuentas bancarias para conciliar"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Conciliacion bancaria</h2>
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setSelectedId(e.target.value)}
            value={selectedId}
          >
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}

        {!activeReconciliation ? (
          <form className="mt-4 grid grid-cols-3 gap-3" onSubmit={(e) => void onStart(e)}>
            <input
              className="rounded-md border border-ink-100 px-3 py-2 text-sm"
              onChange={(e) => setPeriodEnd(e.target.value)}
              type="date"
              value={periodEnd}
            />
            <input
              className="rounded-md border border-ink-100 px-3 py-2 text-sm"
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder="Saldo segun estado de cuenta"
              step="0.01"
              type="number"
              value={statementBalance}
            />
            <button
              className="w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
              type="submit"
            >
              Iniciar conciliacion
            </button>
          </form>
        ) : (
          <div className="mt-4 rounded-md bg-ink-50 p-4 text-sm text-ink-700">
            Conciliacion en progreso al {new Date(activeReconciliation.periodEnd).toLocaleDateString("es-CR")}.
            Saldo segun estado de cuenta: {formatCents(activeReconciliation.statementEndingBalance)}. Marca
            los movimientos que aparecen en tu estado de cuenta y luego completa la conciliacion.
          </div>
        )}
      </section>

      {activeReconciliation ? (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Descripcion</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {pendingTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString("es-CR")}</td>
                  <td className="px-4 py-2 text-ink-700">{tx.description}</td>
                  <td className="px-4 py-2 text-right">{formatCents(tx.amount)}</td>
                  <td className="px-4 py-2 text-right">
                    <label className="flex items-center justify-end gap-2 text-xs text-ink-700">
                      <input
                        checked={tx.status === "matched"}
                        onChange={(e) => void onToggleMatch(tx.id, e.target.checked)}
                        type="checkbox"
                      />
                      Aparece en el estado de cuenta
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-ink-100 p-4">
            <button
              className="rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
              onClick={() => void onComplete()}
              type="button"
            >
              Completar conciliacion
            </button>
          </div>
        </section>
      ) : null}

      {reconciliations.filter((r) => r.status === "completed").length > 0 ? (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <div className="border-b border-ink-100 px-4 py-2 text-xs font-semibold uppercase text-ink-700">
            Historial
          </div>
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2 text-right">Estado de cuenta</th>
                <th className="px-4 py-2 text-right">Libro mayor</th>
                <th className="px-4 py-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {reconciliations
                .filter((r) => r.status === "completed")
                .map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{new Date(r.periodEnd).toLocaleDateString("es-CR")}</td>
                    <td className="px-4 py-2 text-right">{formatCents(r.statementEndingBalance)}</td>
                    <td className="px-4 py-2 text-right">{formatCents(r.bookBalance ?? 0)}</td>
                    <td className="px-4 py-2 text-right">{formatCents(r.difference ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
