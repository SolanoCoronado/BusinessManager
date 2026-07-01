import { z } from "zod";

export const InvoiceFormSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente."),
  issueDate: z.string().min(1, "La fecha es requerida."),
  memo: z.string().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1, "Descripcion requerida."),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        taxRateId: z.string().optional(),
      }),
    )
    .min(1, "Agrega al menos una linea."),
});

export type InvoiceFormValues = z.infer<typeof InvoiceFormSchema>;
