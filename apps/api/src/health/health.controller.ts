import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("live")
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: "ok" };
  }

  @Public()
  @Get("ready")
  async ready() {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
    ]);

    if (!databaseHealthy || !redisHealthy) {
      throw new ServiceUnavailableException("One or more dependencies are not ready");
    }

    return { status: "ok", checks: { database: "ok", redis: "ok" } };
  }
}
