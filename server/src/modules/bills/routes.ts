import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { confirmBill, createBill, getBill, listBills, voidBill } from "./service.js";
import { CreateBillSchema } from "./schemas.js";

export async function billsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/bills",
    { preHandler: [authenticate, requirePermission("bills", "view")] },
    async (request) => {
      const bills = await listBills(request.authUser!.companyId);
      return { bills };
    },
  );

  app.get(
    "/api/v1/bills/:id",
    { preHandler: [authenticate, requirePermission("bills", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const bill = await getBill(request.authUser!.companyId, id);
      return { bill };
    },
  );

  app.post(
    "/api/v1/bills",
    { preHandler: [authenticate, requirePermission("bills", "create")] },
    async (request, reply) => {
      const parsed = CreateBillSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de cuenta por pagar invalidos.", parsed.error.flatten());
      }

      const bill = await createBill(request.authUser!.companyId, request.authUser!.sub, parsed.data);

      reply.code(201);
      return { bill };
    },
  );

  app.post(
    "/api/v1/bills/:id/confirm",
    { preHandler: [authenticate, requirePermission("bills", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const bill = await confirmBill(request.authUser!.companyId, request.authUser!.sub, id);
      return { bill };
    },
  );

  app.post(
    "/api/v1/bills/:id/void",
    { preHandler: [authenticate, requirePermission("bills", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const bill = await voidBill(request.authUser!.companyId, request.authUser!.sub, id);
      return { bill };
    },
  );
}
