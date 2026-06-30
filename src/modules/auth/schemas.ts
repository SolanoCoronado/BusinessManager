import { z } from "zod";

export const OnboardingFormSchema = z.object({
  companyDisplayName: z.string().min(1, "El nombre de la empresa es requerido."),
  adminName: z.string().min(1, "El nombre es requerido."),
  adminEmail: z.string().email("Correo invalido."),
  adminPassword: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

export type OnboardingFormValues = z.infer<typeof OnboardingFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email("Correo invalido."),
  password: z.string().min(1, "La contrasena es requerida."),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;
