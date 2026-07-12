import pino, { type Logger, type LoggerOptions } from "pino";

export interface CreateLoggerOptions {
  serviceName: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Creates a structured pino logger with a consistent shape across
 * every service: `service`, `requestId` (bound per-request), and
 * ISO timestamps. Pretty-printing is opt-in for local development.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { serviceName, level = "info", pretty = process.env.NODE_ENV !== "production" } = options;

  const config: LoggerOptions = {
    level,
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ["req.headers.authorization", "*.password", "*.token", "*.refreshToken"],
      censor: "[REDACTED]",
    },
  };

  if (pretty) {
    return pino({
      ...config,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      },
    });
  }

  return pino(config);
}

export type { Logger };
