import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  taxId: z.string().optional(),
  email: z.string().email("Correo invalido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("CRC"),
  defaultAccountId: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const ToggleActiveSchema = z.object({ active: z.boolean() });
