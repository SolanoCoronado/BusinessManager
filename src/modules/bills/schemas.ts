import { z } from "zod";

export const BillFormSchema = z.object({
  vendorId: z.string().min(1, "Selecciona un proveedor."),
  issueDate: z.string().min(1, "La fecha es requerida."),
  memo: z.string().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1, "Descripcion requerida."),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1, "Agrega al menos una linea."),
});

export type BillFormValues = z.infer<typeof BillFormSchema>;
