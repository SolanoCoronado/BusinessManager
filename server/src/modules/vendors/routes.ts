import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createVendor, listVendors, setVendorActive, updateVendor } from "./service.js";
import { CreateVendorSchema, ToggleActiveSchema, UpdateVendorSchema } from "./schemas.js";

export async function vendorsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/vendors",
    { preHandler: [authenticate, requirePermission("vendors", "view")] },
    async (request) => {
      const vendors = await listVendors(request.authUser!.companyId);
      return { vendors };
    },
  );

  app.post(
    "/api/v1/vendors",
    { preHandler: [authenticate, requirePermission("vendors", "create")] },
    async (request, reply) => {
      const parsed = CreateVendorSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de proveedor invalidos.", parsed.error.flatten());
      }

      const vendor = await createVendor(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { vendor };
    },
  );

  app.patch(
    "/api/v1/vendors/:id",
    { preHandler: [authenticate, requirePermission("vendors", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateVendorSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de proveedor invalidos.", parsed.error.flatten());
      }

      const vendor = await updateVendor(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data,
      );
      return { vendor };
    },
  );

  app.patch(
    "/api/v1/vendors/:id/active",
    { preHandler: [authenticate, requirePermission("vendors", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = ToggleActiveSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Solicitud invalida.");
      }

      const vendor = await setVendorActive(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data.active,
      );
      return { vendor };
    },
  );
}
