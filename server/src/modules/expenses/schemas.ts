import { z } from "zod";

export const CreateExpenseSchema = z.object({
  vendorId: z.string().optional(),
  accountId: z.string().min(1, "Selecciona la cuenta de gasto."),
  paidFromAccountId: z.string().min(1, "Selecciona la cuenta de banco o caja."),
  amount: z.number().int().positive(),
  date: z.coerce.date(),
  memo: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
