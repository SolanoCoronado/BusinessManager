import { prisma } from "../../db/client.js";
import { recordAudit } from "../../shared/audit/auditLog.js";
import { hashPassword } from "../../shared/auth/password.js";
import { ConflictError, NotFoundError } from "../../shared/errors/AppError.js";
import type { CreateUserInput } from "./schemas.js";

export async function listUsers(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
}

export async function createUser(
  companyId: string,
  actorUserId: string,
  input: CreateUserInput,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new ConflictError("Ya existe un usuario con ese correo.");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      companyId,
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
    },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, role: user.role },
  });

  return user;
}

export async function setUserActive(
  companyId: string,
  actorUserId: string,
  targetUserId: string,
  active: boolean,
) {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, companyId } });
  if (!target) {
    throw new NotFoundError("Usuario no encontrado.");
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { active },
  });

  await recordAudit(prisma, {
    companyId,
    userId: actorUserId,
    action: active ? "user.activated" : "user.deactivated",
    entityType: "User",
    entityId: targetUserId,
    before: { active: target.active },
    after: { active: updated.active },
  });

  return updated;
}
