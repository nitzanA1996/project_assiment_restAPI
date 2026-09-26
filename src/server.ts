import type { Server } from "node:http";
import { createApp } from "./app.js";
import type { Environment } from "./config/env-schema.js";
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from "./config/database.js";

export async function startServer(env: Environment): Promise<Server> {
  await connectDatabase(env);
  const app = createApp({ allowedOrigins: env.CORS_ORIGINS, isReady: isDatabaseConnected });
  try {
    return await new Promise<Server>((resolve, reject) => {
      const server = app.listen(env.PORT, () => {
        server.off("error", reject);
        resolve(server);
      });
      server.once("error", reject);
    });
  } catch {
    await disconnectDatabase();
    throw new Error("HTTP server could not start. Check whether the configured port is already in use.");
  }
}

export function registerShutdown(server: Server): void {
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      void disconnectDatabase().then(() => {
        clearTimeout(timeout);
        process.exitCode = 0;
      }).catch(() => {
        console.error("Database shutdown failed.");
        process.exitCode = 1;
      });
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
