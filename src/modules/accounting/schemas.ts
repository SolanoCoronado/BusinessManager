import { z } from "zod";

export const JournalEntryFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  memo: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1, "Selecciona una cuenta."),
        debit: z.number().min(0),
        credit: z.number().min(0),
      }),
    )
    .min(2, "Un asiento requiere al menos dos lineas."),
});

export type JournalEntryFormValues = z.infer<typeof JournalEntryFormSchema>;
