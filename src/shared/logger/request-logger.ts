import morgan from "morgan";

morgan.token("safe-path", (request) => (request.url ?? "/").split("?")[0] ?? "/");

export const requestLogger = morgan(
  ":date[iso] :method :safe-path :status :response-time ms",
);
