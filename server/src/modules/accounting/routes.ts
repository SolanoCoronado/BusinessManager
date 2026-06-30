import type { FastifyInstance } from "fastify";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { CreateAccountSchema } from "./accounts.schemas.js";
import { createAccount, getAccountWithBalance, listAccounts } from "./accounts.service.js";
import { CreateJournalEntrySchema } from "./journalEntries.schemas.js";
import {
  createJournalEntry,
  getJournalEntry,
  listJournalEntries,
  reverseJournalEntry,
} from "./journalEntries.service.js";

export async function accountingRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/accounting/accounts",
    { preHandler: authenticate },
    async (request) => {
      const accounts = await listAccounts(request.authUser!.companyId);
      return { accounts };
    },
  );

  app.get(
    "/api/v1/accounting/accounts/:id",
    { preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const result = await getAccountWithBalance(request.authUser!.companyId, id);
      return result;
    },
  );

  app.post(
    "/api/v1/accounting/accounts",
    { preHandler: [authenticate, requireRole("admin", "contable")] },
    async (request, reply) => {
      const parsed = CreateAccountSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de cuenta invalidos.", parsed.error.flatten());
      }

      const account = await createAccount(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { account };
    },
  );

  app.get(
    "/api/v1/accounting/journal-entries",
    { preHandler: authenticate },
    async (request) => {
      const entries = await listJournalEntries(request.authUser!.companyId);
      return { entries };
    },
  );

  app.get(
    "/api/v1/accounting/journal-entries/:id",
    { preHandler: authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      const entry = await getJournalEntry(request.authUser!.companyId, id);
      return { entry };
    },
  );

  app.post(
    "/api/v1/accounting/journal-entries",
    { preHandler: [authenticate, requireRole("admin", "contable")] },
    async (request, reply) => {
      const parsed = CreateJournalEntrySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de asiento invalidos.", parsed.error.flatten());
      }

      const entry = await createJournalEntry(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { entry };
    },
  );

  app.post(
    "/api/v1/accounting/journal-entries/:id/reverse",
    { preHandler: [authenticate, requireRole("admin", "contable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reversal = await reverseJournalEntry(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
      );

      reply.code(201);
      return { entry: reversal };
    },
  );
}
