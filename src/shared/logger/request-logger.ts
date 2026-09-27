import morgan from "morgan";

morgan.token("safe-path", (request) => {
  const url = "originalUrl" in request && typeof request.originalUrl === "string"
    ? request.originalUrl : request.url;
  return (url ?? "/").split("?")[0] ?? "/";
});

export const requestLogger = morgan(
  ":date[iso] :method :safe-path :status :response-time ms",
);
