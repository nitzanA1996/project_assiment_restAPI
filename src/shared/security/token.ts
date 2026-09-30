import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { objectIdSchema } from "../schemas/common.schema.js";
import { AppError } from "../errors/app-error.js";

export interface TokenConfig {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: number;
}

const claimsSchema = z.object({
  _id: objectIdSchema,
  isBusiness: z.boolean(),
  isAdmin: z.boolean(),
  exp: z.number().int(),
  iat: z.number().int(),
});

export interface TokenUser {
  _id: string;
  isBusiness: boolean;
  isAdmin: boolean;
}

const issuer = "business-cards-api";
const audience = "business-cards-client";

export async function issueToken(user: TokenUser, config: TokenConfig): Promise<string> {
  const key = new TextEncoder().encode(config.JWT_SECRET);
  return new SignJWT({ _id: user._id, isBusiness: user.isBusiness, isAdmin: user.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + config.JWT_EXPIRES_IN)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(key);
}

export async function verifyToken(token: string, config: TokenConfig): Promise<TokenUser> {
  try {
    const key = new TextEncoder().encode(config.JWT_SECRET);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer, audience });
    return claimsSchema.parse(payload);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "The access token is invalid or expired.");
  }
}
