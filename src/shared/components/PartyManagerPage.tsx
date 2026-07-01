import { useEffect, useState } from "react";

import { useAuth } from "../../app/providers/AuthProvider";
import { ApiError, type CreatePartyInput, type PartyDto } from "../lib/apiClient";
import { EmptyState } from "./EmptyState";
import type { LucideIcon } from "lucide-react";

type PartyManagerPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  listFn: (token: string) => Promise<{ [key: string]: PartyDto[] }>;
  createFn: (token: string, input: CreatePartyInput) => Promise<{ [key: string]: PartyDto }>;
  setActiveFn: (token: string, id: string, active: boolean) => Promise<unknown>;
};

export function PartyManagerPage({
  title,
  description,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  listFn,
  createFn,
  setActiveFn,
}: PartyManagerPageProps) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PartyDto[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load(token: string) {
    try {
      const result = await listFn(token);
      const list = Object.values(result)[0] ?? [];
      setItems(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista.");
    }
  }

  useEffect(() => {
    if (accessToken) void load(accessToken);
    // load() solo depende del token; listFn viene de props estables (apiClient.*).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await createFn(accessToken, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName("");
      setEmail("");
      setPhone("");
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el registro.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleActive(id: string, active: boolean) {
    if (!accessToken) return;
    try {
      await setActiveFn(accessToken, id, !active);
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el estado.");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <Icon aria-hidden="true" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">{description}</p>
          </div>
        </div>

        <form className="mt-6 grid grid-cols-4 gap-3" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="col-span-2 rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            type="text"
            value={name}
          />
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo (opcional)"
            type="email"
            value={email}
          />
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefono (opcional)"
            type="text"
            value={phone}
          />
          <button
            className="col-span-4 w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={submitting || !name.trim()}
            type="submit"
          >
            {submitting ? "Guardando..." : "Agregar"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {items.length === 0 ? (
        <EmptyState description={emptyDescription} icon={Icon} title={emptyTitle} />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Telefono</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 font-medium text-ink-900">{item.name}</td>
                  <td className="px-4 py-2 text-ink-700">{item.email || "-"}</td>
                  <td className="px-4 py-2 text-ink-700">{item.phone || "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        item.active
                          ? "rounded-md bg-mint-700/10 px-2 py-1 text-xs font-semibold text-mint-700"
                          : "rounded-md bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-700"
                      }
                    >
                      {item.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-xs font-semibold text-ink-700 hover:text-mint-700"
                      onClick={() => void onToggleActive(item.id, item.active)}
                      type="button"
                    >
                      {item.active ? "Desactivar" : "Activar"}
                    </button>
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
