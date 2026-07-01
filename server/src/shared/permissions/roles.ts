export const ROLES = ["admin", "contable", "ventas"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type Resource =
  | "companies"
  | "users"
  | "accounting"
  | "invoices"
  | "reports"
  | "customers"
  | "vendors"
  | "products"
  | "taxRates"
  | "bills"
  | "payments"
  | "expenses"
  | "banking"
  | "audit"
  | "backups";
export type Action = "view" | "create" | "edit" | "delete";

// Matriz fija de permisos para el MVP. Si en el futuro el negocio necesita
// roles personalizables, esto se mueve a una tabla Role/Permission en la DB
// (ver "Roles personalizables detallados" en deep-research-report.md, nivel avanzado).
const PERMISSION_MATRIX: Record<Role, Record<Resource, Action[]>> = {
  admin: {
    companies: ["view", "create", "edit", "delete"],
    users: ["view", "create", "edit", "delete"],
    accounting: ["view", "create", "edit", "delete"],
    invoices: ["view", "create", "edit", "delete"],
    reports: ["view", "create", "edit", "delete"],
    customers: ["view", "create", "edit", "delete"],
    vendors: ["view", "create", "edit", "delete"],
    products: ["view", "create", "edit", "delete"],
    taxRates: ["view", "create", "edit", "delete"],
    bills: ["view", "create", "edit", "delete"],
    payments: ["view", "create", "edit", "delete"],
    expenses: ["view", "create", "edit", "delete"],
    banking: ["view", "create", "edit", "delete"],
    audit: ["view"],
    backups: ["view", "create", "edit"],
  },
  contable: {
    companies: ["view"],
    users: ["view"],
    accounting: ["view", "create", "edit"],
    invoices: ["view", "create", "edit"],
    reports: ["view"],
    customers: ["view", "create", "edit"],
    vendors: ["view", "create", "edit"],
    products: ["view", "create", "edit"],
    taxRates: ["view", "create", "edit"],
    bills: ["view", "create", "edit"],
    payments: ["view", "create", "edit"],
    expenses: ["view", "create", "edit"],
    banking: ["view", "create", "edit"],
    audit: ["view"],
    backups: ["view", "create"],
  },
  ventas: {
    companies: ["view"],
    users: [],
    accounting: ["view"],
    invoices: ["view", "create"],
    reports: ["view"],
    customers: ["view", "create"],
    vendors: ["view"],
    products: ["view", "create"],
    taxRates: ["view"],
    bills: ["view"],
    payments: ["view", "create"],
    expenses: ["view"],
    banking: ["view"],
    audit: [],
    backups: [],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSION_MATRIX[role][resource].includes(action);
}
