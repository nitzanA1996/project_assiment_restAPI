import type { RequestHandler } from "express";
import type { z } from "zod";
import { AppError } from "../shared/errors/app-error.js";

export function validate(schema: z.ZodType, source: "body" | "params" = "body"): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid request input.",
        result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))));
      return;
    }
    // Controllers consume only validated and normalized values from this object.
    response.locals.validated = { ...response.locals.validated, [source]: result.data };
    next();
  };
}
