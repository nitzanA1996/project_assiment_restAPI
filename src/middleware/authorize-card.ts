import type { RequestHandler } from "express";
import { Card } from "../cards/card.model.js";
import type { UserDocument } from "../users/user.serializer.js";
import { AppError } from "../shared/errors/app-error.js";

export const requireBusiness: RequestHandler = (_request, response, next) => {
  const user = response.locals.user as UserDocument;
  if (!user.isBusiness) throw new AppError(403, "BUSINESS_REQUIRED", "A business account is required.");
  next();
};

export function authorizeCardOwner(allowAdmin: boolean): RequestHandler {
  return async (_request, response, next) => {
    const user = response.locals.user as UserDocument;
    const id = response.locals.validated.params.id as string;
    const card = await Card.findById(id);
    if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
    if (card.user_id.toString() !== user._id.toString() && !(allowAdmin && user.isAdmin)) {
      throw new AppError(403, "FORBIDDEN", "You are not allowed to change this card.");
    }
    next();
  };
}
