import { z } from "zod";

export const CreateJournalEntrySchema = z.object({
  date: z.coerce.date(),
  memo: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1),
        debit: z.number().int().min(0),
        credit: z.number().int().min(0),
        memo: z.string().optional(),
      }),
    )
    .min(2, "Un asiento requiere al menos dos lineas."),
});

export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntrySchema>;
