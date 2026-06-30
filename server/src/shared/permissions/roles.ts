export const ROLES = ["admin", "contable", "ventas"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

type Resource = "companies" | "users" | "accounting" | "invoices" | "reports";
type Action = "view" | "create" | "edit" | "delete";

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
  },
  contable: {
    companies: ["view"],
    users: ["view"],
    accounting: ["view", "create", "edit"],
    invoices: ["view", "create", "edit"],
    reports: ["view"],
  },
  ventas: {
    companies: ["view"],
    users: [],
    accounting: ["view"],
    invoices: ["view", "create"],
    reports: ["view"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSION_MATRIX[role][resource].includes(action);
}
