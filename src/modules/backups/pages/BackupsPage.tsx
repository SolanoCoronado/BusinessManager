import { Archive } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { apiClient, ApiError, type BackupDto } from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";
import { useEscapeKey } from "../../../shared/hooks/useEscapeKey";

const numberFormatter = new Intl.NumberFormat("es-CR");
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${numberFormatter.format(Math.round(bytes / 1024))} KB`;
  return `${numberFormatter.format(Math.round(bytes / (1024 * 1024)))} MB`;
}

export function BackupsPage() {
  const { accessToken, logout } = useAuth();
  const [backups, setBackups] = useState<BackupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingFilename, setConfirmingFilename] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function load(token: string) {
    try {
      const res = await apiClient.listBackups(token);
      setBackups(res.backups);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar los respaldos.");
    }
  }

  useEffect(() => {
    if (accessToken) void load(accessToken);
  }, [accessToken]);

  useEscapeKey(() => setConfirmingFilename(null), Boolean(confirmingFilename));

  async function onCreate() {
    if (!accessToken) return;
    setCreating(true);
    setError(null);
    try {
      await apiClient.createBackup(accessToken);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el respaldo.");
    } finally {
      setCreating(false);
    }
  }

  async function onConfirmRestore() {
    if (!accessToken || !confirmingFilename) return;
    setRestoring(true);
    setError(null);
    try {
      await apiClient.restoreBackup(accessToken, confirmingFilename);
      setConfirmingFilename(null);
      // La base de datos activa cambio por completo: la sesion actual puede
      // apuntar a datos que ya no son consistentes con el respaldo restaurado.
      // Forzamos un nuevo inicio de sesion para partir de un estado limpio.
      await logout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restaurar el respaldo.");
      setRestoring(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
              <Archive aria-hidden="true" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-ink-900">Respaldos</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
                Copia local de toda la base de datos. Restaurar reemplaza todos los datos actuales
                por los del respaldo elegido (se guarda automaticamente una copia del estado
                actual antes de restaurar).
              </p>
            </div>
          </div>
          <button
            className="w-fit shrink-0 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={creating}
            onClick={() => void onCreate()}
            type="button"
          >
            {creating ? "Creando..." : "Crear respaldo"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {backups.length === 0 ? (
        <EmptyState
          description="Crea tu primer respaldo con el boton de arriba."
          icon={Archive}
          title="Todavia no hay respaldos"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Archivo</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2 text-right">Tamano</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {backups.map((backup) => (
                <tr key={backup.filename}>
                  <td className="px-4 py-2 font-mono text-xs text-ink-900">{backup.filename}</td>
                  <td className="px-4 py-2 text-ink-700">
                    {new Date(backup.createdAt).toLocaleString("es-CR")}
                  </td>
                  <td className="px-4 py-2 text-right text-ink-700">
                    {formatBytes(backup.sizeBytes)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-xs font-semibold text-ink-700 hover:text-amberline"
                      onClick={() => setConfirmingFilename(backup.filename)}
                      type="button"
                    >
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {confirmingFilename ? (
        <div
          aria-label="Cerrar"
          className="fixed inset-0 flex items-center justify-center bg-ink-900/40 p-4"
          onClick={() => setConfirmingFilename(null)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="w-full max-w-md rounded-md bg-white p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="text-base font-semibold text-ink-900">Confirmar restauracion</h3>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              Vas a reemplazar todos los datos actuales con el respaldo{" "}
              <span className="font-mono text-xs">{confirmingFilename}</span>. Esta accion no se
              puede deshacer desde la aplicacion (aunque se guarda una copia previa del estado
              actual). Despues de restaurar tendras que iniciar sesion de nuevo.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-md border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
                disabled={restoring}
                onClick={() => setConfirmingFilename(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-amberline px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                disabled={restoring}
                onClick={() => void onConfirmRestore()}
                type="button"
              >
                {restoring ? "Restaurando..." : "Si, restaurar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
