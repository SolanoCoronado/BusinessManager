import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createExpense, listExpenses, voidExpense } from "./service.js";
import { CreateExpenseSchema } from "./schemas.js";

export async function expensesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/expenses",
    { preHandler: [authenticate, requirePermission("expenses", "view")] },
    async (request) => {
      const expenses = await listExpenses(request.authUser!.companyId);
      return { expenses };
    },
  );

  app.post(
    "/api/v1/expenses",
    { preHandler: [authenticate, requirePermission("expenses", "create")] },
    async (request, reply) => {
      const parsed = CreateExpenseSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de gasto invalidos.", parsed.error.flatten());
      }

      const expense = await createExpense(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { expense };
    },
  );

  app.post(
    "/api/v1/expenses/:id/void",
    { preHandler: [authenticate, requirePermission("expenses", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const expense = await voidExpense(request.authUser!.companyId, request.authUser!.sub, id);
      return { expense };
    },
  );
}
