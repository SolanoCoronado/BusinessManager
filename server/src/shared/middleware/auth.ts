import type { FastifyRequest } from "fastify";

import { verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.js";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import { can, type Action, type Resource, type Role } from "../permissions/roles.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AccessTokenPayload;
  }
}

export async function authenticate(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Falta el token de acceso.");
  }

  const token = header.slice("Bearer ".length);

  try {
    request.authUser = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Token de acceso invalido o expirado.");
  }
}

export function requireRole(...roles: Role[]) {
  return async function checkRole(request: FastifyRequest) {
    if (!request.authUser) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(request.authUser.role)) {
      throw new ForbiddenError();
    }
  };
}

export function requirePermission(resource: Resource, action: Action) {
  return async function checkPermission(request: FastifyRequest) {
    if (!request.authUser) {
      throw new UnauthorizedError();
    }

    if (!can(request.authUser.role, resource, action)) {
      throw new ForbiddenError();
    }
  };
}
