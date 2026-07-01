import { z } from "zod";

const InvoiceLineInputSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "La descripcion es requerida."),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0),
  taxRateId: z.string().optional(),
});

export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente."),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  memo: z.string().optional(),
  lines: z.array(InvoiceLineInputSchema).min(1, "La factura requiere al menos una linea."),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
