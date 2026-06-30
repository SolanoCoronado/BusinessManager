import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiClient,
  ApiError,
  type AccountDto,
  type JournalEntryDto,
} from "../../../shared/lib/apiClient";
import { JournalEntryFormSchema, type JournalEntryFormValues } from "../schemas";
import { validateBalancedJournalEntry } from "../services/journalValidation";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });

function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const ACCOUNT_TYPE_LABELS: Record<AccountDto["type"], string> = {
  asset: "Activo",
  liability: "Pasivo",
  equity: "Patrimonio",
  income: "Ingreso",
  expense: "Gasto",
};

export function AccountingPage() {
  const { accessToken } = useAuth();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, watch, formState } =
    useForm<JournalEntryFormValues>({
      resolver: zodResolver(JournalEntryFormSchema),
      defaultValues: {
        date: todayIsoDate(),
        memo: "",
        lines: [
          { accountId: "", debit: 0, credit: 0 },
          { accountId: "", debit: 0, credit: 0 },
        ],
      },
    });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");

  async function loadData(token: string) {
    try {
      const [accountsRes, entriesRes] = await Promise.all([
        apiClient.listAccounts(token),
        apiClient.listJournalEntries(token),
      ]);
      setAccounts(accountsRes.accounts);
      setEntries(entriesRes.entries);

      const balanceEntries = await Promise.all(
        accountsRes.accounts.map(async (account) => {
          const result = await apiClient.getAccountBalance(token, account.id);
          return [account.id, result.balance] as const;
        }),
      );
      setBalances(Object.fromEntries(balanceEntries));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "No se pudo cargar la contabilidad.");
    }
  }

  useEffect(() => {
    if (accessToken) void loadData(accessToken);
  }, [accessToken]);

  const liveBalance = validateBalancedJournalEntry(
    watchedLines.map((line) => ({
      accountId: line.accountId,
      debitAmount: Math.round((line.debit || 0) * 100),
      creditAmount: Math.round((line.credit || 0) * 100),
    })),
  );

  async function onSubmit(values: JournalEntryFormValues) {
    if (!accessToken) return;
    setActionError(null);

    try {
      await apiClient.createJournalEntry(accessToken, {
        date: values.date,
        memo: values.memo || undefined,
        lines: values.lines.map((line) => ({
          accountId: line.accountId,
          debit: Math.round((line.debit || 0) * 100),
          credit: Math.round((line.credit || 0) * 100),
        })),
      });

      reset({
        date: todayIsoDate(),
        memo: "",
        lines: [
          { accountId: "", debit: 0, credit: 0 },
          { accountId: "", debit: 0, credit: 0 },
        ],
      });
      await loadData(accessToken);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudo crear el asiento.");
    }
  }

  async function onReverse(entryId: string) {
    if (!accessToken) return;
    setActionError(null);
    try {
      await apiClient.reverseJournalEntry(accessToken, entryId);
      await loadData(accessToken);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "No se pudo revertir el asiento.");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Catalogo de cuentas</h2>
        {loadError ? <p className="mt-2 text-sm text-amberline">{loadError}</p> : null}
        <div className="mt-4 overflow-hidden rounded-md border border-ink-100">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Codigo</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {accounts.map((account) => (
                <tr key={account.id} className={account.parentId ? "" : "bg-ink-50/50 font-medium"}>
                  <td className="px-4 py-2">{account.code}</td>
                  <td className="px-4 py-2">{account.parentId ? `  ${account.name}` : account.name}</td>
                  <td className="px-4 py-2 text-ink-700">{ACCOUNT_TYPE_LABELS[account.type]}</td>
                  <td className="px-4 py-2 text-right">{formatCents(balances[account.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Nuevo asiento manual</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink-800" htmlFor="date">
                Fecha
              </label>
              <input
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                id="date"
                type="date"
                {...register("date")}
              />
              {formState.errors.date ? (
                <p className="mt-1 text-xs text-amberline">{formState.errors.date.message}</p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-ink-800" htmlFor="memo">
                Memo (opcional)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
                id="memo"
                type="text"
                {...register("memo")}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-ink-100">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
                <tr>
                  <th className="px-3 py-2">Cuenta</th>
                  <th className="px-3 py-2 text-right">Debe</th>
                  <th className="px-3 py-2 text-right">Haber</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-md border border-ink-100 px-2 py-1.5 text-sm"
                        {...register(`lines.${index}.accountId` as const)}
                      >
                        <option value="">Selecciona una cuenta</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-28 rounded-md border border-ink-100 px-2 py-1.5 text-right text-sm"
                        step="0.01"
                        type="number"
                        {...register(`lines.${index}.debit` as const, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-28 rounded-md border border-ink-100 px-2 py-1.5 text-right text-sm"
                        step="0.01"
                        type="number"
                        {...register(`lines.${index}.credit` as const, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fields.length > 2 ? (
                        <button
                          aria-label="Quitar linea"
                          className="text-ink-700 hover:text-amberline"
                          onClick={() => remove(index)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="flex w-fit items-center gap-2 text-sm font-semibold text-mint-700 hover:text-mint-600"
            onClick={() => append({ accountId: "", debit: 0, credit: 0 })}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Agregar linea
          </button>

          <div className="flex items-center justify-between rounded-md bg-ink-50 px-4 py-3 text-sm">
            {liveBalance.valid ? (
              <span className="text-mint-700">
                Balanceado: {formatCents(liveBalance.totalDebit)} debe / haber
              </span>
            ) : (
              <span className="text-amberline">{liveBalance.reason}</span>
            )}
          </div>

          {actionError ? <p className="text-sm text-amberline">{actionError}</p> : null}

          <button
            className="w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={formState.isSubmitting || !liveBalance.valid}
            type="submit"
          >
            {formState.isSubmitting ? "Guardando..." : "Crear asiento"}
          </button>
        </form>
      </section>

      <section className="rounded-md border border-ink-100 bg-white">
        <div className="border-b border-ink-100 p-6">
          <h2 className="text-lg font-semibold text-ink-900">Asientos recientes</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-ink-700">Todavia no hay asientos registrados.</p>
          ) : (
            entries.map((entry) => {
              const total = entry.lines.reduce((sum, line) => sum + line.debit, 0);
              return (
                <div className="flex items-center justify-between p-4" key={entry.id}>
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {new Date(entry.date).toLocaleDateString("es-CR")} - {entry.memo || "Sin memo"}
                    </p>
                    <p className="text-xs text-ink-700">
                      {entry.lines.length} lineas - {formatCents(total)}
                      {entry.sourceType === "reversal" ? " - Reverso" : ""}
                    </p>
                  </div>
                  {entry.sourceType !== "reversal" ? (
                    <button
                      className="flex items-center gap-2 rounded-md border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-amberline hover:text-amberline"
                      onClick={() => void onReverse(entry.id)}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={14} />
                      Revertir
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
