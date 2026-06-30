import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { verifyPassword } from "../../shared/auth/password.js";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import type { LoginInput } from "./schemas.js";

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user || !user.active) {
    throw new UnauthorizedError("Credenciales invalidas.");
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatches) {
    throw new UnauthorizedError("Credenciales invalidas.");
  }

  await recordAudit(prisma, {
    companyId: user.companyId,
    userId: user.id,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
  });

  return user;
}

export function findActiveUserById(id: string) {
  return prisma.user.findFirst({ where: { id, active: true } });
}
