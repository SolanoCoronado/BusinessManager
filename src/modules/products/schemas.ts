import { z } from "zod";

export const ProductFormSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido."),
  name: z.string().min(1, "El nombre es requerido."),
  type: z.enum(["product", "service"]),
  unitPrice: z.number().min(0),
  taxRateId: z.string().optional(),
  trackInventory: z.boolean(),
  stockQuantity: z.number().int().min(0),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
