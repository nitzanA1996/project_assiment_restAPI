import jwt from "jsonwebtoken";
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

export function issueToken(user: TokenUser, config: TokenConfig): string {
  return jwt.sign({ _id: user._id, isBusiness: user.isBusiness, isAdmin: user.isAdmin }, config.JWT_SECRET, {
    algorithm: "HS256", expiresIn: config.JWT_EXPIRES_IN, issuer, audience,
  });
}

export function verifyToken(token: string, config: TokenConfig): TokenUser {
  try {
    const verified = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"], issuer, audience });
    return claimsSchema.parse(verified);
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "The access token is invalid or expired.");
  }
}
