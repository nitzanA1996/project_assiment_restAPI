import type { Server } from "node:http";
import { createApp } from "./app.js";
import type { Environment } from "./config/env-schema.js";
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from "./config/database.js";
import { User } from "./users/user.model.js";
import { Card } from "./cards/card.model.js";

export async function startServer(env: Environment): Promise<Server> {
  await connectDatabase(env);
  try {
    await User.init();
    await Card.init();
  } catch (error) {
    await disconnectDatabase();
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "number"
      ? error.code : "unknown";
    const message = error instanceof Error ? error.message : "";
    const reason = /not authorized|unauthorized|not allowed/i.test(message)
      ? "Database user lacks permission to create collections or indexes."
      : /too long|length/i.test(message) ? "The database name exceeds the cluster limit."
      : "Check database permissions and existing duplicate emails or business numbers.";
    throw new Error(`Database storage initialization failed (code: ${code}). ${reason}`);
  }
  const app = createApp({ allowedOrigins: env.CORS_ORIGINS, isReady: isDatabaseConnected, tokenConfig: env });
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
