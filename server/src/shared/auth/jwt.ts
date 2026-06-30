import jwt from "jsonwebtoken";

import type { Role } from "../permissions/roles.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado. Revisa server/.env");
  }
  return secret;
}

export type AccessTokenPayload = {
  sub: string;
  companyId: string;
  role: Role;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, getSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, getSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as AccessTokenPayload;
  if (decoded.type !== "access") {
    throw new Error("Token invalido para esta operacion.");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Token invalido para esta operacion.");
  }
  return decoded;
}
