import { z } from "zod";

export const CreateVendorSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  taxId: z.string().optional(),
  email: z.string().email("Correo invalido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentTermsDays: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("CRC"),
  defaultAccountId: z.string().optional(),
});

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;

export const UpdateVendorSchema = CreateVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;

export const ToggleActiveSchema = z.object({ active: z.boolean() });
