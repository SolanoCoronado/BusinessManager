import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { apiClient, ApiError, type AuditLogDto } from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";

export function AuditPage() {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .listAuditLogs(accessToken, 200)
      .then((res) => setLogs(res.logs))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la auditoria.");
      });
  }, [accessToken]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <ShieldCheck aria-hidden="true" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">Auditoria</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              Eventos importantes y cambios de permisos. Muestra los ultimos 200 registros, mas
              recientes primero.
            </p>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {logs.length === 0 ? (
        <EmptyState
          description="Las acciones sensibles (crear, confirmar, anular, restaurar) apareceran aqui."
          icon={ShieldCheck}
          title="Todavia no hay eventos de auditoria"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Accion</th>
                <th className="px-4 py-2">Entidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2 text-ink-700">
                    {new Date(log.createdAt).toLocaleString("es-CR")}
                  </td>
                  <td className="px-4 py-2">{log.user?.name ?? "Sistema"}</td>
                  <td className="px-4 py-2 font-medium text-ink-900">{log.action}</td>
                  <td className="px-4 py-2 text-ink-700">
                    {log.entityType}
                    {log.entityId ? ` (${log.entityId.slice(0, 8)})` : ""}
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
