import type { FastifyInstance } from "fastify";

import { authenticate, requirePermission } from "../../shared/middleware/auth.js";
import { setRefreshCookie } from "../../shared/auth/cookies.js";
import { issueTokenPair } from "../../shared/auth/issueTokens.js";
import { ValidationError } from "../../shared/errors/AppError.js";
import { getCurrentCompany, onboardCompany, updateCompany } from "./service.js";
import { OnboardingSchema, UpdateCompanySchema } from "./schemas.js";

export async function companiesRoutes(app: FastifyInstance) {
  // Publico a proposito: el frontend lo usa para decidir si mostrar onboarding o login,
  // antes de tener ninguna sesion. No expone datos del negocio, solo un booleano.
  app.get("/api/v1/companies/exists", async () => {
    const company = await getCurrentCompany();
    return { exists: company !== null };
  });

  app.post("/api/v1/onboarding", async (request, reply) => {
    const parsed = OnboardingSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Datos de registro invalidos.", parsed.error.flatten());
    }

    const { company, admin } = await onboardCompany(parsed.data);
    const tokens = issueTokenPair({ id: admin.id, companyId: company.id, role: admin.role });

    setRefreshCookie(reply, tokens.refreshToken);
    reply.code(201);

    return {
      company: { id: company.id, displayName: company.displayName },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      accessToken: tokens.accessToken,
    };
  });

  app.get("/api/v1/companies/current", { preHandler: authenticate }, async () => {
    const company = await getCurrentCompany();
    return { company };
  });

  app.patch(
    "/api/v1/companies/current",
    { preHandler: [authenticate, requirePermission("companies", "edit")] },
    async (request) => {
      const parsed = UpdateCompanySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError("Datos de empresa invalidos.", parsed.error.flatten());
      }

      const company = await updateCompany(
        request.authUser!.companyId,
        request.authUser!.sub,
        parsed.data,
      );
      return { company };
    },
  );
}
