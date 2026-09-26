import { env } from "./config/env.js";

import { registerShutdown, startServer } from "./server.js";

try {
  const server = await startServer(env);
  registerShutdown(server);
  console.info(`API listening on port ${env.PORT} (${env.NODE_ENV}, ${env.DB_TARGET}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Server startup failed.");
  process.exitCode = 1;
}
