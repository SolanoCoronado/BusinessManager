import { z } from "zod";

export const CreateTaxRateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  rate: z.number().min(0).max(100),
  accountId: z.string().optional(),
});

export type CreateTaxRateInput = z.infer<typeof CreateTaxRateSchema>;

export const ToggleActiveSchema = z.object({ active: z.boolean() });
