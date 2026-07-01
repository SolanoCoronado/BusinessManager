import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createTaxRate, listTaxRates, setTaxRateActive } from "./service.js";
import { CreateTaxRateSchema, ToggleActiveSchema } from "./schemas.js";

export async function taxRatesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/tax-rates",
    { preHandler: [authenticate, requirePermission("taxRates", "view")] },
    async (request) => {
      const taxRates = await listTaxRates(request.authUser!.companyId);
      return { taxRates };
    },
  );

  app.post(
    "/api/v1/tax-rates",
    { preHandler: [authenticate, requirePermission("taxRates", "create")] },
    async (request, reply) => {
      const parsed = CreateTaxRateSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de impuesto invalidos.", parsed.error.flatten());
      }

      const taxRate = await createTaxRate(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { taxRate };
    },
  );

  app.patch(
    "/api/v1/tax-rates/:id/active",
    { preHandler: [authenticate, requirePermission("taxRates", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = ToggleActiveSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Solicitud invalida.");
      }

      const taxRate = await setTaxRateActive(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data.active,
      );
      return { taxRate };
    },
  );
}
