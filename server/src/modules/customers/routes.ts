import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createCustomer, listCustomers, setCustomerActive, updateCustomer } from "./service.js";
import { CreateCustomerSchema, ToggleActiveSchema, UpdateCustomerSchema } from "./schemas.js";

export async function customersRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/customers",
    { preHandler: [authenticate, requirePermission("customers", "view")] },
    async (request) => {
      const customers = await listCustomers(request.authUser!.companyId);
      return { customers };
    },
  );

  app.post(
    "/api/v1/customers",
    { preHandler: [authenticate, requirePermission("customers", "create")] },
    async (request, reply) => {
      const parsed = CreateCustomerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de cliente invalidos.", parsed.error.flatten());
      }

      const customer = await createCustomer(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { customer };
    },
  );

  app.patch(
    "/api/v1/customers/:id",
    { preHandler: [authenticate, requirePermission("customers", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateCustomerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de cliente invalidos.", parsed.error.flatten());
      }

      const customer = await updateCustomer(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data,
      );
      return { customer };
    },
  );

  app.patch(
    "/api/v1/customers/:id/active",
    { preHandler: [authenticate, requirePermission("customers", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = ToggleActiveSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Solicitud invalida.");
      }

      const customer = await setCustomerActive(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data.active,
      );
      return { customer };
    },
  );
}
