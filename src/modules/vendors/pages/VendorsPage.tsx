import { Users } from "lucide-react";

import { apiClient } from "../../../shared/lib/apiClient";
import { PartyManagerPage } from "../../../shared/components/PartyManagerPage";

export function VendorsPage() {
  return (
    <PartyManagerPage
      createFn={apiClient.createVendor}
      description="Proveedores, cuentas por pagar e historial de compras."
      emptyDescription="Agrega tu primer proveedor con el formulario de arriba."
      emptyTitle="Todavia no hay proveedores registrados"
      icon={Users}
      listFn={apiClient.listVendors}
      setActiveFn={apiClient.setVendorActive}
      title="Proveedores"
    />
  );
}
