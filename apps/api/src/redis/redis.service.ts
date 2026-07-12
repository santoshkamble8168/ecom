import { ApiEnv } from "@ecom/config";
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

import { APP_ENV } from "../config/config.module";

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(APP_ENV) env: ApiEnv) {
    super({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const reply = await this.ping();
      return reply === "PONG";
    } catch {
      return false;
    }
  }
}
