import express from "express";
import cors from "cors";
import { createCorsOptions } from "./config/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestLogger } from "./shared/logger/request-logger.js";
import { AppError } from "./shared/errors/app-error.js";
import { createUserRouter } from "./users/user.routes.js";
import type { TokenConfig } from "./shared/security/token.js";
import { createCardRouter } from "./cards/card.routes.js";
import { createErrorFileLogger } from "./shared/logger/file-logger.js";

interface AppOptions {
  allowedOrigins: string[];
  isReady: () => boolean;
  tokenConfig: TokenConfig;
  errorLogDirectory?: string;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(createErrorFileLogger(options.errorLogDirectory));
  app.use(requestLogger);
  app.use(cors(createCorsOptions(options.allowedOrigins)));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, _response, next) => {
    const hasBody = Number(request.headers["content-length"] ?? 0) > 0 || request.headers["transfer-encoding"] !== undefined;
    if (["POST", "PUT", "PATCH"].includes(request.method) && hasBody && !request.is("application/json")) {
      next(new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Use Content-Type: application/json."));
      return;
    }
    next();
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get("/ready", (_request, response) => {
    const ready = options.isReady();
    response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  });

  app.use("/users", createUserRouter(options.tokenConfig));
  app.use("/cards", createCardRouter(options.tokenConfig));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
