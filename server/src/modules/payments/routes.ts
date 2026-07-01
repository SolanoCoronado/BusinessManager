import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createPayment, listPayments } from "./service.js";
import { CreatePaymentSchema } from "./schemas.js";

export async function paymentsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/payments",
    { preHandler: [authenticate, requirePermission("payments", "view")] },
    async (request) => {
      const payments = await listPayments(request.authUser!.companyId);
      return { payments };
    },
  );

  app.post(
    "/api/v1/payments",
    { preHandler: [authenticate, requirePermission("payments", "create")] },
    async (request, reply) => {
      const parsed = CreatePaymentSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de pago invalidos.", parsed.error.flatten());
      }

      const payment = await createPayment(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { payment };
    },
  );
}
