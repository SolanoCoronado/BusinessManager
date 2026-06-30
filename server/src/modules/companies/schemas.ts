import { z } from "zod";

export const OnboardingSchema = z.object({
  company: z.object({
    displayName: z.string().min(1, "El nombre de la empresa es requerido."),
    legalName: z.string().min(1).optional(),
    taxId: z.string().optional(),
    baseCurrency: z.string().length(3).default("CRC"),
    secondaryCurrency: z.string().length(3).optional(),
    locale: z.string().default("es-CR"),
  }),
  admin: z.object({
    name: z.string().min(1, "El nombre del administrador es requerido."),
    email: z.string().email("Correo invalido."),
    password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
  }),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
