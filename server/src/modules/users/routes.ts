import type { FastifyInstance } from "fastify";

import { authenticate, requireRole } from "../../shared/middleware/auth.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { createUser, listUsers, setUserActive } from "./service.js";
import { CreateUserSchema, ToggleActiveSchema, UserIdParamsSchema } from "./schemas.js";

export async function usersRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/users",
    { preHandler: [authenticate, requireRole("admin", "contable")] },
    async (request) => {
      const users = await listUsers(request.authUser!.companyId);
      return { users };
    },
  );

  app.post(
    "/api/v1/users",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      const parsed = CreateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de usuario invalidos.", parsed.error.flatten());
      }

      const user = await createUser(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );

      reply.code(201);
      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    },
  );

  app.patch(
    "/api/v1/users/:id/active",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request) => {
      const params = UserIdParamsSchema.safeParse(request.params);
      const body = ToggleActiveSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        throw new ValidationError("Solicitud invalida.");
      }

      const user = await setUserActive(
        request.authUser!.companyId,
        request.authUser!.sub,
        params.data.id,
        body.data.active,
      );

      return { user: { id: user.id, active: user.active } };
    },
  );
}
