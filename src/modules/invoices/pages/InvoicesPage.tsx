import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  apiClient,
  ApiError,
  type AccountDto,
  type InvoiceDto,
  type PartyDto,
  type TaxRateDto,
} from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";
import { useEscapeKey } from "../../../shared/hooks/useEscapeKey";
import { InvoiceFormSchema, type InvoiceFormValues } from "../schemas";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  partially_paid: "Pago parcial",
  paid: "Pagada",
  void: "Anulada",
};

export function InvoicesPage() {
  const { accessToken } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [customers, setCustomers] = useState<PartyDto[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");

  const { register, control, handleSubmit, reset, formState } = useForm<InvoiceFormValues>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: {
      customerId: "",
      issueDate: todayIsoDate(),
      memo: "",
      lines: [{ description: "", quantity: 1, unitPrice: 0, taxRateId: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  async function load(token: string) {
    try {
      const [invoicesRes, customersRes, taxRatesRes, accountsRes] = await Promise.all([
        apiClient.listInvoices(token),
        apiClient.listCustomers(token),
        apiClient.listTaxRates(token),
        apiClient.listAccounts(token),
      ]);
      setInvoices(invoicesRes.invoices);
      setCustomers(customersRes.customers);
      setTaxRates(taxRatesRes.taxRates);
      setBankAccounts(accountsRes.accounts.filter((a) => a.code === "1010" || a.code === "1020"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar las facturas.");
    }
  }

  useEffect(() => {
    if (accessToken) void load(accessToken);
  }, [accessToken]);

  useEscapeKey(() => setPayingInvoiceId(null), Boolean(payingInvoiceId));

  async function onSubmit(values: InvoiceFormValues) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiClient.createInvoice(accessToken, {
        customerId: values.customerId,
        issueDate: values.issueDate,
        memo: values.memo || undefined,
        lines: values.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: Math.round(line.unitPrice * 100),
          taxRateId: line.taxRateId || undefined,
        })),
      });
      reset({
        customerId: "",
        issueDate: todayIsoDate(),
        memo: "",
        lines: [{ description: "", quantity: 1, unitPrice: 0, taxRateId: "" }],
      });
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la factura.");
    }
  }

  async function onConfirm(id: string) {
    if (!accessToken) return;
    try {
      await apiClient.confirmInvoice(accessToken, id);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar la factura.");
    }
  }

  async function onVoid(id: string) {
    if (!accessToken) return;
    try {
      await apiClient.voidInvoice(accessToken, id);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo anular la factura.");
    }
  }

  function startPayment(invoiceId: string) {
    setPayingInvoiceId(invoiceId);
    setPaymentAmount("");
    setPaymentAccountId(bankAccounts[0]?.id ?? "");
  }

  async function submitPayment() {
    if (!accessToken || !payingInvoiceId) return;
    const amount = Math.round(Number(paymentAmount) * 100);
    if (!amount || !paymentAccountId) return;
    try {
      await apiClient.createPayment(accessToken, {
        type: "customer",
        invoiceId: payingInvoiceId,
        amount,
        date: todayIsoDate(),
        accountId: paymentAccountId,
      });
      setPayingInvoiceId(null);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el pago.");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900">Nueva factura</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div className="grid grid-cols-3 gap-4">
            <select
              className="rounded-md border border-ink-100 px-3 py-2 text-sm"
              {...register("customerId")}
            >
              <option value="">Selecciona un cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border border-ink-100 px-3 py-2 text-sm"
              type="date"
              {...register("issueDate")}
            />
            <input
              className="rounded-md border border-ink-100 px-3 py-2 text-sm"
              placeholder="Memo (opcional)"
              type="text"
              {...register("memo")}
            />
          </div>

          <div className="overflow-hidden rounded-md border border-ink-100">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
                <tr>
                  <th className="px-3 py-2">Descripcion</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Precio unitario</th>
                  <th className="px-3 py-2">Impuesto</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-ink-100 px-2 py-1.5 text-sm"
                        type="text"
                        {...register(`lines.${index}.description` as const)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded-md border border-ink-100 px-2 py-1.5 text-right text-sm"
                        step="0.01"
                        type="number"
                        {...register(`lines.${index}.quantity` as const, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-28 rounded-md border border-ink-100 px-2 py-1.5 text-right text-sm"
                        step="0.01"
                        type="number"
                        {...register(`lines.${index}.unitPrice` as const, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
                        {...register(`lines.${index}.taxRateId` as const)}
                      >
                        <option value="">Sin impuesto</option>
                        {taxRates.map((tax) => (
                          <option key={tax.id} value={tax.id}>
                            {tax.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fields.length > 1 ? (
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
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxRateId: "" })}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Agregar linea
          </button>

          {error ? <p className="text-sm text-amberline">{error}</p> : null}

          <button
            className="w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={formState.isSubmitting}
            type="submit"
          >
            {formState.isSubmitting ? "Guardando..." : "Crear factura"}
          </button>
        </form>
      </section>

      {invoices.length === 0 ? (
        <EmptyState
          description="Crea tu primera factura con el formulario de arriba."
          icon={FileText}
          title="Todavia no hay facturas"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Numero</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-2 font-medium text-ink-900">{invoice.number}</td>
                  <td className="px-4 py-2 text-ink-700">{invoice.customer?.name}</td>
                  <td className="px-4 py-2 text-ink-700">{STATUS_LABELS[invoice.status]}</td>
                  <td className="px-4 py-2 text-right">{formatCents(invoice.total)}</td>
                  <td className="px-4 py-2 text-right">{formatCents(invoice.balanceDue)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {invoice.status === "draft" ? (
                        <>
                          <button
                            className="text-xs font-semibold text-mint-700 hover:text-mint-600"
                            onClick={() => void onConfirm(invoice.id)}
                            type="button"
                          >
                            Confirmar
                          </button>
                          <button
                            className="text-xs font-semibold text-ink-700 hover:text-amberline"
                            onClick={() => void onVoid(invoice.id)}
                            type="button"
                          >
                            Anular
                          </button>
                        </>
                      ) : null}
                      {invoice.status === "confirmed" || invoice.status === "partially_paid" ? (
                        <>
                          <button
                            className="text-xs font-semibold text-mint-700 hover:text-mint-600"
                            onClick={() => startPayment(invoice.id)}
                            type="button"
                          >
                            Registrar pago
                          </button>
                          {invoice.status === "confirmed" ? (
                            <button
                              className="text-xs font-semibold text-ink-700 hover:text-amberline"
                              onClick={() => void onVoid(invoice.id)}
                              type="button"
                            >
                              Anular
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {payingInvoiceId ? (
        <div
          aria-label="Cerrar"
          className="fixed inset-0 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setPayingInvoiceId(null)}
          role="presentation"
        >
          <div
            aria-label="Registrar pago"
            aria-modal="true"
            className="w-full max-w-sm rounded-md bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="text-base font-semibold text-ink-900">Registrar pago</h3>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Monto"
                step="0.01"
                type="number"
                value={paymentAmount}
              />
              <select
                className="rounded-md border border-ink-100 px-3 py-2 text-sm"
                onChange={(e) => setPaymentAccountId(e.target.value)}
                value={paymentAccountId}
              >
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-md border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                onClick={() => setPayingInvoiceId(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
                onClick={() => void submitPayment()}
                type="button"
              >
                Guardar pago
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
