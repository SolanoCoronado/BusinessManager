import type { Prisma } from "@prisma/client";

import type { AccountType } from "../../shared/accounting/accountTypes.js";

type DefaultAccount = {
  code: string;
  name: string;
  type: AccountType;
  children?: DefaultAccount[];
};

// Catalogo inicial generico para una pequena empresa (Costa Rica, CRC/USD).
// No pretende cumplir un plan contable oficial; es un punto de partida editable.
const DEFAULT_CHART: DefaultAccount[] = [
  {
    code: "1000",
    name: "Activo Circulante",
    type: "asset",
    children: [
      { code: "1010", name: "Caja", type: "asset" },
      { code: "1020", name: "Banco", type: "asset" },
      { code: "1100", name: "Cuentas por Cobrar", type: "asset" },
      { code: "1200", name: "Inventario", type: "asset" },
    ],
  },
  {
    code: "2000",
    name: "Pasivo Circulante",
    type: "liability",
    children: [
      { code: "2010", name: "Cuentas por Pagar", type: "liability" },
      { code: "2020", name: "Impuestos por Pagar", type: "liability" },
    ],
  },
  {
    code: "3000",
    name: "Patrimonio",
    type: "equity",
    children: [
      { code: "3010", name: "Capital Social", type: "equity" },
      { code: "3020", name: "Utilidades Retenidas", type: "equity" },
    ],
  },
  {
    code: "4000",
    name: "Ingresos",
    type: "income",
    children: [
      { code: "4010", name: "Ingresos por Ventas", type: "income" },
      { code: "4020", name: "Ingresos por Servicios", type: "income" },
    ],
  },
  {
    code: "5000",
    name: "Gastos",
    type: "expense",
    children: [
      { code: "5010", name: "Costo de Ventas", type: "expense" },
      { code: "5020", name: "Gastos Operativos", type: "expense" },
      { code: "5030", name: "Gastos de Nomina", type: "expense" },
    ],
  },
];

export async function seedDefaultChartOfAccounts(tx: Prisma.TransactionClient, companyId: string) {
  for (const parent of DEFAULT_CHART) {
    const createdParent = await tx.account.create({
      data: {
        companyId,
        code: parent.code,
        name: parent.name,
        type: parent.type,
        isSystem: true,
      },
    });

    for (const child of parent.children ?? []) {
      await tx.account.create({
        data: {
          companyId,
          code: child.code,
          name: child.name,
          type: child.type,
          parentId: createdParent.id,
          isSystem: true,
        },
      });
    }
  }
}
