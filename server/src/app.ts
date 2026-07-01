import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";

import { accountingRoutes } from "./modules/accounting/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { backupsRoutes } from "./modules/backups/routes.js";
import { bankingRoutes } from "./modules/banking/routes.js";
import { billsRoutes } from "./modules/bills/routes.js";
import { companiesRoutes } from "./modules/companies/routes.js";
import { customersRoutes } from "./modules/customers/routes.js";
import { expensesRoutes } from "./modules/expenses/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { invoicesRoutes } from "./modules/invoices/routes.js";
import { paymentsRoutes } from "./modules/payments/routes.js";
import { productsRoutes } from "./modules/products/routes.js";
import { reportsRoutes } from "./modules/reports/routes.js";
import { taxRatesRoutes } from "./modules/taxRates/routes.js";
import { usersRoutes } from "./modules/users/routes.js";
import { vendorsRoutes } from "./modules/vendors/routes.js";
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
  await app.register(customersRoutes);
  await app.register(vendorsRoutes);
  await app.register(productsRoutes);
  await app.register(taxRatesRoutes);
  await app.register(invoicesRoutes);
  await app.register(billsRoutes);
  await app.register(paymentsRoutes);
  await app.register(expensesRoutes);
  await app.register(bankingRoutes);
  await app.register(reportsRoutes);
  await app.register(auditRoutes);
  await app.register(backupsRoutes);

  return app;
}
