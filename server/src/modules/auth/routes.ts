import type { FastifyInstance } from "fastify";

import { clearRefreshCookie, setRefreshCookie, REFRESH_COOKIE_NAME } from "../../shared/auth/cookies.js";
import { issueTokenPair } from "../../shared/auth/issueTokens.js";
import { verifyRefreshToken } from "../../shared/auth/jwt.js";
import { ValidationError, UnauthorizedError } from "../../shared/errors/AppError.js";
import { authenticate } from "../../shared/middleware/auth.js";
import { findActiveUserById, login } from "./service.js";
import { LoginSchema } from "./schemas.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Datos de inicio de sesion invalidos.", parsed.error.flatten());
    }

    const user = await login(parsed.data);
    const tokens = issueTokenPair(user);
    setRefreshCookie(reply, tokens.refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
    };
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedError("Falta el token de renovacion.");
    }

    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).sub;
    } catch {
      throw new UnauthorizedError("Token de renovacion invalido o expirado.");
    }

    const user = await findActiveUserById(userId);
    if (!user) {
      throw new UnauthorizedError("Usuario no encontrado o inactivo.");
    }

    const tokens = issueTokenPair(user);
    setRefreshCookie(reply, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  });

  app.post("/api/v1/auth/logout", async (_request, reply) => {
    clearRefreshCookie(reply);
    return { ok: true };
  });

  app.get("/api/v1/auth/me", { preHandler: authenticate }, async (request) => {
    const user = await findActiveUserById(request.authUser!.sub);
    if (!user) {
      throw new UnauthorizedError("Usuario no encontrado o inactivo.");
    }

    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });
}
