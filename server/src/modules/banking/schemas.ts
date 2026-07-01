import { z } from "zod";

export const CreateBankAccountSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  accountId: z.string().min(1, "Selecciona la cuenta contable asociada."),
  currency: z.string().length(3).default("CRC"),
  openingBalance: z.number().int().default(0),
});
export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const CreateTransactionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1, "La descripcion es requerida."),
  amount: z.number().int().refine((v) => v !== 0, "El monto no puede ser cero."),
});
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const ImportTransactionsSchema = z.object({
  rows: z
    .array(
      z.object({
        date: z.coerce.date(),
        description: z.string().min(1),
        amount: z.number().int().refine((v) => v !== 0, "El monto no puede ser cero."),
      }),
    )
    .min(1, "El archivo no tiene movimientos validos."),
});
export type ImportTransactionsInput = z.infer<typeof ImportTransactionsSchema>;

export const StartReconciliationSchema = z.object({
  bankAccountId: z.string().min(1),
  periodEnd: z.coerce.date(),
  statementEndingBalance: z.number().int(),
});
export type StartReconciliationInput = z.infer<typeof StartReconciliationSchema>;
