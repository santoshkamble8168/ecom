import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Mirrors `apps/api/src/prisma/prisma.service.ts`. The worker shares the
 * same generated Prisma client (same `schema.prisma`, same `DATABASE_URL`)
 * so scheduled jobs read/write the identical tables the API does — there is
 * no separate worker-owned schema.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
