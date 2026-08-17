import type { ApiEnv } from "@ecom/config";
import { NotFoundError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";

import { evaluateFeatureFlag } from "./feature-flag.policy";
import { FeatureFlagsService } from "./feature-flags.service";

function baseFlag(overrides: Record<string, unknown> = {}) {
  return {
    id: "ff-1",
    key: "checkout.express",
    isEnabled: true,
    description: "Express checkout",
    environment: "all",
    rolloutPercent: 100,
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

function baseEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    NODE_ENV: "test",
    FEATURE_FLAG_CACHE_TTL_SECONDS: 30,
    ...overrides,
  } as unknown as ApiEnv;
}

describe("evaluateFeatureFlag", () => {
  it("returns false when the flag is disabled", () => {
    expect(
      evaluateFeatureFlag({ isEnabled: false, environment: "all", rolloutPercent: 100 }, "test"),
    ).toBe(false);
  });

  it("returns false when the environment does not match", () => {
    expect(
      evaluateFeatureFlag(
        { isEnabled: true, environment: "production", rolloutPercent: 100 },
        "test",
      ),
    ).toBe(false);
  });

  it("returns false when rolloutPercent is 0", () => {
    expect(
      evaluateFeatureFlag({ isEnabled: true, environment: "all", rolloutPercent: 0 }, "test"),
    ).toBe(false);
  });

  it("returns true when enabled, env matches, and rolloutPercent is 100", () => {
    expect(
      evaluateFeatureFlag({ isEnabled: true, environment: "all", rolloutPercent: 100 }, "test"),
    ).toBe(true);
    expect(
      evaluateFeatureFlag(
        { isEnabled: true, environment: "test", rolloutPercent: 100 },
        "test",
      ),
    ).toBe(true);
  });

  it("returns false for partial rollout (not sticky per-user yet)", () => {
    expect(
      evaluateFeatureFlag({ isEnabled: true, environment: "all", rolloutPercent: 50 }, "test"),
    ).toBe(false);
  });
});

describe("FeatureFlagsService", () => {
  let service: FeatureFlagsService;
  let prisma: { featureFlag: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let audit: { log: jest.Mock };
  let redis: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    prisma = {
      featureFlag: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
    };

    service = new FeatureFlagsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      redis as unknown as RedisService,
      baseEnv(),
    );
  });

  describe("isEnabled", () => {
    it("returns false when the flag is missing", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.isEnabled("missing")).resolves.toBe(false);
    });

    it("returns false for a disabled flag even at 100% rollout", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag({ isEnabled: false }));

      await expect(service.isEnabled("checkout.express")).resolves.toBe(false);
    });

    it("returns false when the flag is scoped to another environment", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag({ environment: "production" }));

      await expect(service.isEnabled("checkout.express")).resolves.toBe(false);
    });

    it("returns false at 0% rollout and true at 100%", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag({ rolloutPercent: 0 }));
      await expect(service.isEnabled("checkout.express")).resolves.toBe(false);

      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag({ rolloutPercent: 100 }));
      await expect(service.isEnabled("checkout.express")).resolves.toBe(true);
    });

    it("uses the Redis cache when present and does not hit the database", async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ isEnabled: true, environment: "all", rolloutPercent: 100 }),
      );

      await expect(service.isEnabled("checkout.express")).resolves.toBe(true);
      expect(prisma.featureFlag.findUnique).not.toHaveBeenCalled();
    });

    it("still evaluates when Redis is down", async () => {
      redis.get.mockRejectedValue(new Error("ECONNREFUSED"));
      redis.setex.mockRejectedValue(new Error("ECONNREFUSED"));
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag());

      await expect(service.isEnabled("checkout.express")).resolves.toBe(true);
    });
  });

  describe("update", () => {
    it("throws NotFoundError when the key is missing", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.update("admin-1", "missing", { isEnabled: true })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("updates, invalidates cache, and writes an audit event", async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(baseFlag({ isEnabled: false }));
      prisma.featureFlag.update.mockResolvedValue(baseFlag({ isEnabled: true }));

      const result = await service.update("admin-1", "checkout.express", { isEnabled: true });

      expect(result.isEnabled).toBe(true);
      expect(redis.del).toHaveBeenCalledWith("ff:v1:checkout.express");
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          action: "feature_flag.updated",
        }),
      );
    });
  });
});
