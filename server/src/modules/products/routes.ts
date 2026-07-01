import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createProduct, listProducts, setProductActive, updateProduct } from "./service.js";
import { CreateProductSchema, ToggleActiveSchema, UpdateProductSchema } from "./schemas.js";

export async function productsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/products",
    { preHandler: [authenticate, requirePermission("products", "view")] },
    async (request) => {
      const products = await listProducts(request.authUser!.companyId);
      return { products };
    },
  );

  app.post(
    "/api/v1/products",
    { preHandler: [authenticate, requirePermission("products", "create")] },
    async (request, reply) => {
      const parsed = CreateProductSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de producto invalidos.", parsed.error.flatten());
      }

      const product = await createProduct(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { product };
    },
  );

  app.patch(
    "/api/v1/products/:id",
    { preHandler: [authenticate, requirePermission("products", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = UpdateProductSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de producto invalidos.", parsed.error.flatten());
      }

      const product = await updateProduct(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data,
      );
      return { product };
    },
  );

  app.patch(
    "/api/v1/products/:id/active",
    { preHandler: [authenticate, requirePermission("products", "edit")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parsed = ToggleActiveSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Solicitud invalida.");
      }

      const product = await setProductActive(
        request.authUser!.companyId,
        request.authUser!.sub,
        id,
        parsed.data.active,
      );
      return { product };
    },
  );
}
