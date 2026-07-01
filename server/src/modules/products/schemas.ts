import { z } from "zod";

export const PRODUCT_TYPES = ["product", "service"] as const;

export const CreateProductSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido."),
  name: z.string().min(1, "El nombre es requerido."),
  type: z.enum(PRODUCT_TYPES),
  unitPrice: z.number().int().min(0),
  taxRateId: z.string().optional(),
  trackInventory: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).default(0),
  incomeAccountId: z.string().optional(),
  expenseAccountId: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ToggleActiveSchema = z.object({ active: z.boolean() });
