import type { ApiEnv } from "@ecom/config";
import { NotFoundError } from "@ecom/shared";
import type { FeatureFlagRecord } from "@ecom/types";
import { Inject, Injectable } from "@nestjs/common";
import type { FeatureFlag as FeatureFlagModel, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { APP_ENV } from "../config/config.module";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

import type { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import {
  evaluateFeatureFlag,
  toFeatureFlagEnvironment,
  type FeatureFlagEvaluationInput,
} from "./feature-flag.policy";

const CACHE_PREFIX = "ff:v1:";

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  async list(): Promise<FeatureFlagRecord[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
    });
    return flags.map((flag) => this.toRecord(flag));
  }

  async update(actorId: string, key: string, dto: UpdateFeatureFlagDto): Promise<FeatureFlagRecord> {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Feature flag not found");

    const before = this.toSnapshot(existing);

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.environment !== undefined ? { environment: dto.environment } : {}),
        ...(dto.rolloutPercent !== undefined ? { rolloutPercent: dto.rolloutPercent } : {}),
      },
    });

    await this.invalidateCache(key);

    await this.audit.log({
      userId: actorId,
      action: "feature_flag.updated",
      entityType: "feature_flag",
      entityId: updated.id,
      before: before as unknown as Prisma.InputJsonValue,
      after: this.toSnapshot(updated) as unknown as Prisma.InputJsonValue,
    });

    return this.toRecord(updated);
  }

  async isEnabled(key: string): Promise<boolean> {
    const cached = await this.readCache(key);
    if (cached) {
      return evaluateFeatureFlag(cached, this.env.NODE_ENV);
    }

    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) return false;

    const payload: FeatureFlagEvaluationInput = {
      isEnabled: flag.isEnabled,
      environment: flag.environment,
      rolloutPercent: flag.rolloutPercent,
    };
    await this.writeCache(key, payload);
    return evaluateFeatureFlag(payload, this.env.NODE_ENV);
  }

  private toRecord(flag: FeatureFlagModel): FeatureFlagRecord {
    return {
      id: flag.id,
      key: flag.key,
      isEnabled: flag.isEnabled,
      description: flag.description,
      environment: toFeatureFlagEnvironment(flag.environment),
      rolloutPercent: flag.rolloutPercent,
      updatedAt: flag.updatedAt.toISOString(),
    };
  }

  private toSnapshot(flag: FeatureFlagModel): FeatureFlagEvaluationInput & { key: string } {
    return {
      key: flag.key,
      isEnabled: flag.isEnabled,
      environment: flag.environment,
      rolloutPercent: flag.rolloutPercent,
    };
  }

  private cacheKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  private async readCache(key: string): Promise<FeatureFlagEvaluationInput | null> {
    try {
      const raw = await this.redis.get(this.cacheKey(key));
      if (!raw) return null;
      return parseCachedFlag(raw);
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, payload: FeatureFlagEvaluationInput): Promise<void> {
    try {
      await this.redis.setex(
        this.cacheKey(key),
        this.env.FEATURE_FLAG_CACHE_TTL_SECONDS,
        JSON.stringify(payload),
      );
    } catch {
      // Redis is optional — evaluation still proceeds from the DB payload.
    }
  }

  private async invalidateCache(key: string): Promise<void> {
    try {
      await this.redis.del(this.cacheKey(key));
    } catch {
      // Redis is optional — the next read will refresh from the database.
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCachedFlag(raw: string): FeatureFlagEvaluationInput | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.isEnabled !== "boolean") return null;
    if (typeof parsed.environment !== "string") return null;
    if (typeof parsed.rolloutPercent !== "number") return null;
    return {
      isEnabled: parsed.isEnabled,
      environment: parsed.environment,
      rolloutPercent: parsed.rolloutPercent,
    };
  } catch {
    return null;
  }
}
