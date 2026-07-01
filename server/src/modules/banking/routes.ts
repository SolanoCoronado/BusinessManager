import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createBankAccount, getBankAccount, listBankAccounts } from "./bankAccounts.service.js";
import {
  createManualTransaction,
  importTransactions,
  listBankTransactions,
  setTransactionIgnored,
} from "./bankTransactions.service.js";
import {
  completeReconciliation,
  getReconciliation,
  listReconciliations,
  setTransactionMatched,
  startReconciliation,
} from "./reconciliations.service.js";
import {
  CreateBankAccountSchema,
  CreateTransactionSchema,
  ImportTransactionsSchema,
  StartReconciliationSchema,
} from "./schemas.js";

export async function bankingRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/banking/bank-accounts",
    { preHandler: [authenticate, requirePermission("banking", "view")] },
    async (request) => {
      const bankAccounts = await listBankAccounts(request.authUser!.companyId);
      return { bankAccounts };
    },
  );

  app.post(
    "/api/v1/banking/bank-accounts",
    { preHandler: [authenticate, requirePermission("banking", "create")] },
    async (request, reply) => {
      const parsed = CreateBankAccountSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de cuenta bancaria invalidos.", parsed.error.flatten());
      }
      const bankAccount = await createBankAccount(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );
      reply.code(201);
      return { bankAccount };
    },
  );

  app.get(
    "/api/v1/banking/bank-accounts/:id",
    { preHandler: [authenticate, requirePermission("banking", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const bankAccount = await getBankAccount(request.authUser!.companyId, id);
      return { bankAccount };
    },
  );

  app.get(
    "/api/v1/banking/bank-accounts/:id/transactions",
    { preHandler: [authenticate, requirePermission("banking", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = request.query as { status?: string };
      const transactions = await listBankTransactions(request.authUser!.companyId, id, status);
      return { transactions };
    },
  );

  app.post(
    "/api/v1/banking/bank-accounts/:id/transactions",
    { preHandler: [authenticate, requirePermission("banking", "create")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = CreateTransactionSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de movimiento invalidos.", parsed.error.flatten());
      }
      const transaction = await createManualTransaction(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data,
      );
      reply.code(201);
      return { transaction };
    },
  );

  app.post(
    "/api/v1/banking/bank-accounts/:id/import",
    { preHandler: [authenticate, requirePermission("banking", "create")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = ImportTransactionsSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de importacion invalidos.", parsed.error.flatten());
      }
      const result = await importTransactions(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data,
      );
      return result;
    },
  );

  app.patch(
    "/api/v1/banking/transactions/:id/ignore",
    { preHandler: [authenticate, requirePermission("banking", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { ignored } = request.body as { ignored: boolean };
      const transaction = await setTransactionIgnored(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        Boolean(ignored),
      );
      return { transaction };
    },
  );

  app.get(
    "/api/v1/banking/bank-accounts/:id/reconciliations",
    { preHandler: [authenticate, requirePermission("banking", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const reconciliations = await listReconciliations(request.authUser!.companyId, id);
      return { reconciliations };
    },
  );

  app.get(
    "/api/v1/banking/reconciliations/:id",
    { preHandler: [authenticate, requirePermission("banking", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const reconciliation = await getReconciliation(request.authUser!.companyId, id);
      return { reconciliation };
    },
  );

  app.post(
    "/api/v1/banking/reconciliations",
    { preHandler: [authenticate, requirePermission("banking", "create")] },
    async (request, reply) => {
      const parsed = StartReconciliationSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de conciliacion invalidos.", parsed.error.flatten());
      }
      const reconciliation = await startReconciliation(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );
      reply.code(201);
      return { reconciliation };
    },
  );

  app.patch(
    "/api/v1/banking/reconciliations/:id/transactions/:transactionId",
    { preHandler: [authenticate, requirePermission("banking", "edit")] },
    async (request) => {
      const { id, transactionId } = request.params as { id: string; transactionId: string };
      const { matched } = request.body as { matched: boolean };
      const transaction = await setTransactionMatched(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        transactionId,
        Boolean(matched),
      );
      return { transaction };
    },
  );

  app.post(
    "/api/v1/banking/reconciliations/:id/complete",
    { preHandler: [authenticate, requirePermission("banking", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const reconciliation = await completeReconciliation(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
      );
      return { reconciliation };
    },
  );
}
