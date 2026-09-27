import type { RequestHandler } from "express";
import type { UserDocument } from "../users/user.serializer.js";
import { AppError } from "../shared/errors/app-error.js";

export function authorize(policy: "admin" | "self" | "self-or-admin"): RequestHandler {
  return (_request, response, next) => {
    const user = response.locals.user as UserDocument | undefined;
    if (!user) throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
    const id = response.locals.validated?.params?.id as string | undefined;
    const isSelf = user._id.toString() === id?.toLowerCase();
    const allowed = policy === "admin" ? user.isAdmin
      : policy === "self" ? isSelf : isSelf || user.isAdmin;
    if (!allowed) throw new AppError(403, "FORBIDDEN", "You are not allowed to perform this action.");
    next();
  };
}
