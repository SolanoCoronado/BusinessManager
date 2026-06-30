import { useEffect, useState } from "react";

import { apiClient } from "../lib/apiClient";

type Status = "checking" | "online" | "offline";

export function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    apiClient
      .getHealth()
      .then(() => {
        if (!cancelled) setStatus("online");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "checking"
      ? "Verificando servidor..."
      : status === "online"
        ? "Servidor local conectado"
        : "Servidor local sin conexion";

  const dotColor =
    status === "online"
      ? "bg-mint-700"
      : status === "offline"
        ? "bg-amberline"
        : "bg-ink-100";

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </div>
  );
}
