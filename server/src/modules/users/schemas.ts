import { z } from "zod";

import { ROLES } from "../../shared/permissions/roles.js";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  email: z.string().email("Correo invalido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
  role: z.enum(ROLES),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const ToggleActiveSchema = z.object({
  active: z.boolean(),
});

export const UserIdParamsSchema = z.object({
  id: z.string().min(1),
});
