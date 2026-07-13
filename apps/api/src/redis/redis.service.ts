import { ApiEnv } from "@ecom/config";
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

import { APP_ENV } from "../config/config.module";

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private available = false;

  constructor(@Inject(APP_ENV) env: ApiEnv) {
    super({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      // Prefer IPv4 — on Windows, "localhost" can resolve to ::1 while Docker
      // publishes Redis only on 127.0.0.1, causing ECONNREFUSED at startup.
      family: 4,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // We manage retries in onModuleInit — disable ioredis auto-reconnect spam.
      retryStrategy: () => null,
    });

    this.on("error", (err: Error) => {
      this.logger.debug(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleInit() {
    const maxAttempts = 15;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.connect();
        this.available = true;
        this.logger.log(`Connected to Redis at ${this.options.host}:${this.options.port}`);
        return;
      } catch {
        if (attempt === maxAttempts) {
          this.disconnect();
          if (process.env.NODE_ENV === "development") {
            this.logger.warn(
              `Redis unavailable at ${this.options.host}:${this.options.port} — run "pnpm docker:up" first. API will start without Redis.`,
            );
            return;
          }
          throw new Error(
            `Redis unavailable at ${this.options.host}:${this.options.port} after ${maxAttempts} attempts — run "pnpm docker:up" first`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async onModuleDestroy() {
    if (this.available) {
      this.disconnect();
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.available) return false;
    try {
      const reply = await this.ping();
      return reply === "PONG";
    } catch {
      return false;
    }
  }
}
