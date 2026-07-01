import { Banknote } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { apiClient, ApiError, type PaymentDto } from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";

const numberFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });
function formatCents(cents: number) {
  return numberFormatter.format(cents / 100);
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export function PaymentsPage() {
  const { accessToken } = useAuth();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .listPayments(accessToken)
      .then((res) => setPayments(res.payments))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "No se pudo cargar los pagos.");
      });
  }, [accessToken]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <Banknote aria-hidden="true" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">Cobros y pagos</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              Historial de pagos aplicados a facturas y cuentas por pagar. Para registrar uno
              nuevo, usa el boton "Registrar pago" desde Facturas o Cuentas por pagar.
            </p>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {payments.length === 0 ? (
        <EmptyState
          description="Los pagos que registres sobre facturas o cuentas por pagar apareceran aqui."
          icon={Banknote}
          title="Todavia no hay pagos registrados"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Metodo</th>
                <th className="px-4 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-2">{new Date(payment.date).toLocaleDateString("es-CR")}</td>
                  <td className="px-4 py-2 text-ink-700">
                    {payment.type === "customer" ? "Cobro a cliente" : "Pago a proveedor"}
                  </td>
                  <td className="px-4 py-2 text-ink-700">{METHOD_LABELS[payment.method]}</td>
                  <td className="px-4 py-2 text-right">{formatCents(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
