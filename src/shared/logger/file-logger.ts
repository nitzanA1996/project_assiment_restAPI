import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { RequestHandler } from "express";

export function createErrorFileLogger(directory = join(process.cwd(), "logs"), now = () => new Date()): RequestHandler {
  return (request, response, next) => {
    response.on("finish", () => {
      if (response.statusCode < 400) return;
      const timestamp = now().toISOString();
      const filename = `${timestamp.slice(0, 10)}.log`;
      const entry = {
        timestamp,
        method: request.method,
        path: request.originalUrl.split("?")[0],
        status: response.statusCode,
        error: response.locals.errorMessage ?? response.statusMessage,
      };
      void mkdir(directory, { recursive: true })
        .then(() => appendFile(join(directory, filename), `${JSON.stringify(entry)}\n`, "utf8"))
        .catch(() => console.error("Failed to write an HTTP error log entry."));
    });
    next();
  };
}
