import { Users } from "lucide-react";

import { apiClient } from "../../../shared/lib/apiClient";
import { PartyManagerPage } from "../../../shared/components/PartyManagerPage";

export function CustomersPage() {
  return (
    <PartyManagerPage
      createFn={apiClient.createCustomer}
      description="Clientes, saldos pendientes e historial de documentos."
      emptyDescription="Agrega tu primer cliente con el formulario de arriba."
      emptyTitle="Todavia no hay clientes registrados"
      icon={Users}
      listFn={apiClient.listCustomers}
      setActiveFn={apiClient.setCustomerActive}
      title="Clientes"
    />
  );
}
