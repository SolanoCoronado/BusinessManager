import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { confirmInvoice, createInvoice, getInvoice, listInvoices, voidInvoice } from "./service.js";
import { CreateInvoiceSchema } from "./schemas.js";

export async function invoicesRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/invoices",
    { preHandler: [authenticate, requirePermission("invoices", "view")] },
    async (request) => {
      const invoices = await listInvoices(request.authUser!.companyId);
      return { invoices };
    },
  );

  app.get(
    "/api/v1/invoices/:id",
    { preHandler: [authenticate, requirePermission("invoices", "view")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const invoice = await getInvoice(request.authUser!.companyId, id);
      return { invoice };
    },
  );

  app.post(
    "/api/v1/invoices",
    { preHandler: [authenticate, requirePermission("invoices", "create")] },
    async (request, reply) => {
      const parsed = CreateInvoiceSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de factura invalidos.", parsed.error.flatten());
      }

      const invoice = await createInvoice(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { invoice };
    },
  );

  app.post(
    "/api/v1/invoices/:id/confirm",
    { preHandler: [authenticate, requirePermission("invoices", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const invoice = await confirmInvoice(request.authUser!.companyId, request.authUser!.sub, id);
      return { invoice };
    },
  );

  app.post(
    "/api/v1/invoices/:id/void",
    { preHandler: [authenticate, requirePermission("invoices", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const invoice = await voidInvoice(request.authUser!.companyId, request.authUser!.sub, id);
      return { invoice };
    },
  );
}
