import { Landmark, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiClient,
  ApiError,
  type AccountDto,
  type BankAccountDto,
  type BankTransactionDto,
} from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  matched: "Por conciliar",
  reconciled: "Conciliado",
  ignored: "Ignorado",
};

type CsvRow = { date: string; description: string; amount: number };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: CsvRow[] = [];

  for (const line of lines) {
    const [rawDate, rawDescription, rawAmount] = line.split(",").map((cell) => cell.trim());
    if (!rawDate || !rawAmount) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue; // salta encabezado u otras filas invalidas
    const amount = Math.round(Number(rawAmount) * 100);
    if (Number.isNaN(amount)) continue;
    rows.push({ date: rawDate, description: rawDescription || "", amount });
  }

  return rows;
}

export function BankingPage() {
  const { accessToken } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<AccountDto[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [transactions, setTransactions] = useState<BankTransactionDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newAccountId, setNewAccountId] = useState("");

  const [moveDate, setMoveDate] = useState(new Date().toISOString().slice(0, 10));
  const [moveDescription, setMoveDescription] = useState("");
  const [moveAmount, setMoveAmount] = useState("");

  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skippedDuplicates: number } | null>(
    null,
  );

  async function loadAccounts(token: string) {
    try {
      const [bankRes, accountsRes] = await Promise.all([
        apiClient.listBankAccounts(token),
        apiClient.listAccounts(token),
      ]);
      setBankAccounts(bankRes.bankAccounts);
      setAssetAccounts(accountsRes.accounts.filter((a) => a.type === "asset" && a.parentId));
      if (!selectedId && bankRes.bankAccounts[0]) {
        setSelectedId(bankRes.bankAccounts[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar las cuentas bancarias.");
    }
  }

  async function loadTransactions(token: string, bankAccountId: string) {
    try {
      const res = await apiClient.listBankTransactions(token, bankAccountId);
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar los movimientos.");
    }
  }

  useEffect(() => {
    if (accessToken) void loadAccounts(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && selectedId) void loadTransactions(accessToken, selectedId);
  }, [accessToken, selectedId]);

  async function onCreateBankAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim() || !newAccountId) return;
    setError(null);
    try {
      await apiClient.createBankAccount(accessToken, { name: newName.trim(), accountId: newAccountId });
      setNewName("");
      setNewAccountId("");
      await loadAccounts(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta bancaria.");
    }
  }

  async function onCreateMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedId || !moveAmount) return;
    setError(null);
    try {
      await apiClient.createBankTransaction(accessToken, selectedId, {
        date: moveDate,
        description: moveDescription || "Movimiento manual",
        amount: Math.round(Number(moveAmount) * 100),
      });
      setMoveDescription("");
      setMoveAmount("");
      await loadTransactions(accessToken, selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el movimiento.");
    }
  }

  function onSelectCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    void file.text().then((text) => setCsvRows(parseCsv(text)));
  }

  async function onConfirmImport() {
    if (!accessToken || !selectedId || csvRows.length === 0) return;
    setError(null);
    try {
      const result = await apiClient.importBankTransactions(accessToken, selectedId, { rows: csvRows });
      setImportResult(result);
      setCsvRows([]);
      await loadTransactions(accessToken, selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo importar el archivo.");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Cuentas bancarias</h2>
        <form className="mt-4 grid grid-cols-3 gap-3" onSubmit={(e) => void onCreateBankAccount(e)}>
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej. Banco Nacional)"
            type="text"
            value={newName}
          />
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setNewAccountId(e.target.value)}
            value={newAccountId}
          >
            <option value="">Cuenta contable asociada</option>
            {assetAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          <button
            className="w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
            type="submit"
          >
            Crear cuenta bancaria
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {bankAccounts.length === 0 ? (
        <EmptyState
          description="Crea una cuenta bancaria con el formulario de arriba para empezar a registrar movimientos."
          icon={Landmark}
          title="Todavia no hay cuentas bancarias"
        />
      ) : (
        <>
          <section className="rounded-md border border-ink-100 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Movimientos</h2>
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

            <form className="mt-4 grid grid-cols-4 gap-3" onSubmit={(e) => void onCreateMovement(e)}>
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setMoveDate(e.target.value)}
                type="date"
                value={moveDate}
              />
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setMoveDescription(e.target.value)}
                placeholder="Descripcion"
                type="text"
                value={moveDescription}
              />
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setMoveAmount(e.target.value)}
                placeholder="Monto (negativo = salida)"
                step="0.01"
                type="number"
                value={moveAmount}
              />
              <button
                className="w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
                type="submit"
              >
                Agregar movimiento
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-mint-700 hover:text-mint-600">
                <Upload aria-hidden="true" size={16} />
                Importar CSV (fecha,descripcion,monto)
                <input accept=".csv" className="hidden" onChange={onSelectCsvFile} type="file" />
              </label>
            </div>

            {csvRows.length > 0 ? (
              <div className="mt-4 rounded-md border border-ink-100">
                <div className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-xs font-semibold uppercase text-ink-700">
                  Vista previa ({csvRows.length} filas)
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-ink-100">
                    {csvRows.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-1.5">{row.date}</td>
                        <td className="px-4 py-1.5">{row.description}</td>
                        <td className="px-4 py-1.5 text-right">{formatCents(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end gap-3 border-t border-ink-100 p-3">
                  <button
                    className="rounded-md border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                    onClick={() => setCsvRows([])}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
                    onClick={() => void onConfirmImport()}
                    type="button"
                  >
                    Confirmar importacion
                  </button>
                </div>
              </div>
            ) : null}

            {importResult ? (
              <p className="mt-3 text-sm text-ink-700">
                Importados: {importResult.imported}. Duplicados omitidos: {importResult.skippedDuplicates}.
              </p>
            ) : null}
          </section>

          {transactions.length === 0 ? (
            <EmptyState
              description="Agrega un movimiento manual o importa un CSV para empezar."
              icon={Landmark}
              title="Sin movimientos todavia"
            />
          ) : (
            <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
                  <tr>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Descripcion</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-2">{new Date(tx.date).toLocaleDateString("es-CR")}</td>
                      <td className="px-4 py-2 text-ink-700">{tx.description}</td>
                      <td className="px-4 py-2 text-right">{formatCents(tx.amount)}</td>
                      <td className="px-4 py-2 text-ink-700">{STATUS_LABELS[tx.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
