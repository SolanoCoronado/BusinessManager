import { z } from "zod";

import { ACCOUNT_TYPES } from "../../shared/accounting/accountTypes.js";

export const CreateAccountSchema = z.object({
  code: z.string().min(1, "El codigo es requerido."),
  name: z.string().min(1, "El nombre es requerido."),
  type: z.enum(ACCOUNT_TYPES),
  parentId: z.string().optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
