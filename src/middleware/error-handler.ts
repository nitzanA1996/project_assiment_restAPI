import type { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.js";

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (typeof error === "object" && error !== null && "type" in error) {
    switch (error.type) {
      case "entity.parse.failed":
        return new AppError(400, "INVALID_JSON", "The request body must contain valid JSON.");
      case "entity.too.large":
        return new AppError(413, "BODY_TOO_LARGE", "The request body exceeds the 100 KB limit.");
      case "charset.unsupported":
      case "encoding.unsupported":
        return new AppError(415, "UNSUPPORTED_ENCODING", "The request encoding is not supported.");
    }
  }
  return new AppError(500, "INTERNAL_ERROR", "An unexpected server error occurred.");
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const normalized = normalizeError(error);
  response.locals.errorMessage = normalized.message;
  if (normalized.status >= 500) console.error("An unexpected request error occurred.");
  response.status(normalized.status).json({
    error: {
      code: normalized.code, message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  });
};
