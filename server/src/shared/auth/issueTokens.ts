import { signAccessToken, signRefreshToken } from "./jwt.js";
import { isRole } from "../permissions/roles.js";

type UserLike = {
  id: string;
  companyId: string;
  role: string;
};

export function issueTokenPair(user: UserLike) {
  if (!isRole(user.role)) {
    throw new Error(`Rol invalido almacenado para el usuario ${user.id}: ${user.role}`);
  }

  const accessToken = signAccessToken({
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ sub: user.id });

  return { accessToken, refreshToken };
}
