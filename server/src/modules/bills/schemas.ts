import { z } from "zod";

const BillLineInputSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "La descripcion es requerida."),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0),
  accountId: z.string().optional(),
});

export const CreateBillSchema = z.object({
  vendorId: z.string().min(1, "Selecciona un proveedor."),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  memo: z.string().optional(),
  lines: z.array(BillLineInputSchema).min(1, "La cuenta por pagar requiere al menos una linea."),
});

export type CreateBillInput = z.infer<typeof CreateBillSchema>;
