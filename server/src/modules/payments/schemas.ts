import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

export const CreatePaymentSchema = z
  .object({
    type: z.enum(["customer", "vendor"]),
    invoiceId: z.string().optional(),
    billId: z.string().optional(),
    amount: z.number().int().positive(),
    date: z.coerce.date(),
    method: z.enum(PAYMENT_METHODS).default("cash"),
    accountId: z.string().min(1, "Selecciona la cuenta de banco o caja."),
    memo: z.string().optional(),
  })
  .refine((data) => (data.type === "customer" ? Boolean(data.invoiceId) : Boolean(data.billId)), {
    message: "Debe indicar la factura (cliente) o la cuenta por pagar (proveedor) correspondiente.",
  });

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
