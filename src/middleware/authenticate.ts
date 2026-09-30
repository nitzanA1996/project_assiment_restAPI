import type { RequestHandler } from "express";
import { User } from "../users/user.model.js";
import { verifyToken } from "../shared/security/token.js";
import type { TokenConfig } from "../shared/security/token.js";
import { AppError } from "../shared/errors/app-error.js";

export function authenticate(config: TokenConfig): RequestHandler {
  return async (request, response, next) => {
    const authorization = request.get("Authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match?.[1]) throw new AppError(401, "AUTH_REQUIRED", "A Bearer access token is required.");
    const claims = await verifyToken(match[1], config);
    const user = await User.findById(claims._id);
    if (!user) throw new AppError(401, "INVALID_TOKEN", "The access token is invalid or expired.");
    // Authorization always uses current database roles, never stale token flags.
    response.locals.user = user;
    next();
  };
}
