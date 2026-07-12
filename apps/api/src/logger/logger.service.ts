import { createLogger, type Logger } from "@ecom/logger";
import { Injectable, LoggerService, Scope } from "@nestjs/common";

/**
 * Nest-compatible logger backed by the shared pino instance. Registered
 * with `Scope.TRANSIENT` so each `Logger.setContext(...)` call gets an
 * isolated context without leaking between injected consumers.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private readonly pino: Logger;
  private context = "App";

  constructor() {
    this.pino = createLogger({ serviceName: "api", level: process.env.LOG_LEVEL ?? "info" });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: unknown, context?: string) {
    this.pino.info({ context: context ?? this.context }, this.stringify(message));
  }

  error(message: unknown, trace?: string, context?: string) {
    this.pino.error({ context: context ?? this.context, trace }, this.stringify(message));
  }

  warn(message: unknown, context?: string) {
    this.pino.warn({ context: context ?? this.context }, this.stringify(message));
  }

  debug(message: unknown, context?: string) {
    this.pino.debug({ context: context ?? this.context }, this.stringify(message));
  }

  verbose(message: unknown, context?: string) {
    this.pino.trace({ context: context ?? this.context }, this.stringify(message));
  }

  private stringify(message: unknown): string {
    return typeof message === "string" ? message : JSON.stringify(message);
  }
}
