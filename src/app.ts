import express from "express";
import cors from "cors";
import { createCorsOptions } from "./config/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestLogger } from "./shared/logger/request-logger.js";
import { AppError } from "./shared/errors/app-error.js";

interface AppOptions {
  allowedOrigins: string[];
  isReady: () => boolean;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(cors(createCorsOptions(options.allowedOrigins)));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, _response, next) => {
    if (["POST", "PUT", "PATCH"].includes(request.method) && !request.is("application/json")) {
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

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
