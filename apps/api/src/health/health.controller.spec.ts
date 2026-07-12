import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let prisma: { isHealthy: jest.Mock };
  let redis: { isHealthy: jest.Mock };

  beforeEach(async () => {
    prisma = { isHealthy: jest.fn() };
    redis = { isHealthy: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it("returns ok for the basic health check", () => {
    expect(controller.check()).toEqual(
      expect.objectContaining({ status: "ok" }),
    );
  });

  it("returns ok for liveness", () => {
    expect(controller.live()).toEqual({ status: "ok" });
  });

  it("returns ok for readiness when the database and redis are healthy", async () => {
    prisma.isHealthy.mockResolvedValue(true);
    redis.isHealthy.mockResolvedValue(true);
    await expect(controller.ready()).resolves.toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("throws when the database is not reachable", async () => {
    prisma.isHealthy.mockResolvedValue(false);
    redis.isHealthy.mockResolvedValue(true);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws when redis is not reachable", async () => {
    prisma.isHealthy.mockResolvedValue(true);
    redis.isHealthy.mockResolvedValue(false);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
