import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";

import { accountingRoutes } from "./modules/accounting/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { companiesRoutes } from "./modules/companies/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { usersRoutes } from "./modules/users/routes.js";
import { AppError } from "./shared/errors/AppError.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });
  await app.register(cookie);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message, details: error.details } });
      return;
    }

    if (error instanceof ZodError) {
      reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Datos invalidos.", details: error.flatten() },
      });
      return;
    }

    app.log.error(error);
    reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Error interno." } });
  });

  await app.register(healthRoutes);
  await app.register(companiesRoutes);
  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(accountingRoutes);

  return app;
}
