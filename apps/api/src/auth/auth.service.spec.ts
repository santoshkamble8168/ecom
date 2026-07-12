import { createHash } from "node:crypto";

import { UnauthorizedError } from "@ecom/shared";
import type { JwtService } from "@nestjs/jwt";
import { OtpChannel } from "@prisma/client";

import type { AppLogger } from "../logger/logger.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { UsersService } from "../users/users.service";
import type { AuditService } from "../audit/audit.service";

import { AuthService } from "./auth.service";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    otpChallenge: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    refreshToken: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    user: { findFirst: jest.Mock; create: jest.Mock; findUniqueOrThrow: jest.Mock };
    role: { findUnique: jest.Mock };
    userRole: { create: jest.Mock };
    oAuthAccount: { upsert: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };
  let logger: { setContext: jest.Mock; log: jest.Mock };
  let audit: { log: jest.Mock };
  let usersService: { ensureProfile: jest.Mock };

  beforeEach(() => {
    prisma = {
      otpChallenge: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      refreshToken: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      user: { findFirst: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn() },
      role: { findUnique: jest.fn() },
      userRole: { create: jest.fn() },
      oAuthAccount: { upsert: jest.fn() },
    };
    jwtService = { sign: jest.fn().mockReturnValue("signed.jwt.token") };
    logger = { setContext: jest.fn(), log: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    usersService = { ensureProfile: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      logger as unknown as AppLogger,
      audit as unknown as AuditService,
      usersService as unknown as UsersService,
    );
  });

  describe("requestOtp", () => {
    it("stores a hashed OTP challenge and returns the expiry window", async () => {
      prisma.otpChallenge.create.mockResolvedValue({});

      const result = await service.requestOtp(OtpChannel.email, "user@example.com");

      expect(prisma.otpChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: OtpChannel.email,
            destination: "user@example.com",
            codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        }),
      );
      expect(result).toEqual({ expiresInSeconds: 600 });
    });
  });

  describe("verifyOtp", () => {
    it("throws when no active challenge exists", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp(OtpChannel.email, "user@example.com", "123456"),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("throws when the challenge has expired", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: "challenge-1",
        codeHash: hash("123456"),
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp(OtpChannel.email, "user@example.com", "123456"),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("throws when attempts are exhausted", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: "challenge-1",
        codeHash: hash("123456"),
        attempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyOtp(OtpChannel.email, "user@example.com", "123456"),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("increments attempts and throws on a code mismatch", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: "challenge-1",
        codeHash: hash("123456"),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyOtp(OtpChannel.email, "user@example.com", "000000"),
      ).rejects.toBeInstanceOf(UnauthorizedError);

      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: "challenge-1" },
        data: { attempts: { increment: 1 } },
      });
    });

    it("issues tokens for demo accounts with the dev bypass OTP", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      prisma.user.findFirst.mockResolvedValue({ id: "demo-user" });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "demo-user",
        email: "customer@ecom.local",
        phone: null,
        roles: [{ role: { name: "customer" } }],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyOtp(OtpChannel.email, "customer@ecom.local", "123456");

      expect(prisma.otpChallenge.findFirst).not.toHaveBeenCalled();
      expect(result.accessToken).toBe("signed.jwt.token");

      process.env.NODE_ENV = originalEnv;
    });

    it("consumes the challenge and issues tokens for a matching code", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: "challenge-1",
        codeHash: hash("123456"),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findFirst.mockResolvedValue({ id: "user-1" });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        roles: [{ role: { name: "customer" } }],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.verifyOtp(OtpChannel.email, "user@example.com", "123456");

      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: "challenge-1" },
        data: { consumedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.refreshToken).toBe("signed.jwt.token");
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it("creates a new customer user when none exists for the destination", async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: "challenge-1",
        codeHash: hash("123456"),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: "user-2" });
      prisma.role.findUnique.mockResolvedValue({ id: "role-1", name: "customer" });
      prisma.userRole.create.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-2",
        email: "new@example.com",
        phone: null,
        roles: [],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.verifyOtp(OtpChannel.email, "new@example.com", "123456");

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: "new@example.com", status: "active" },
      });
      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: "user-2", roleId: "role-1" },
      });
    });
  });

  describe("refresh", () => {
    it("throws when the refresh token is unknown, revoked, or expired", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh("bad-token")).rejects.toBeInstanceOf(UnauthorizedError);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        userId: "user-1",
      });
      await expect(service.refresh("revoked-token")).rejects.toBeInstanceOf(UnauthorizedError);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        userId: "user-1",
      });
      await expect(service.refresh("expired-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("revokes the old token and issues a new token pair", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "rt-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        userId: "user-1",
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        phone: null,
        roles: [],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh("valid-token");

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "rt-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe("signed.jwt.token");
    });
  });
});
