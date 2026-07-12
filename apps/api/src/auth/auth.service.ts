import { createHash, randomInt } from "node:crypto";

import { UnauthorizedError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OtpChannel } from "@prisma/client";

import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

import type { JwtPayload } from "./types/authenticated-user";

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext("AuthService");
  }

  /**
   * Creates an OTP challenge and "delivers" the code. Sprint 0 ships the
   * challenge model, hashing, expiry, and rate-limit primitives; actual
   * email/SMS delivery integrates with the notifications sprint. For now
   * the code is logged so local development and QA can proceed.
   */
  async requestOtp(channel: OtpChannel, destination: string): Promise<{ expiresInSeconds: number }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpChallenge.create({
      data: { channel, destination, codeHash, expiresAt },
    });

    this.logger.log(`OTP for ${destination} via ${channel}: ${code} (dev-only log)`);

    return { expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }

  async verifyOtp(channel: OtpChannel, destination: string, code: string): Promise<IssuedTokens> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { channel, destination, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new UnauthorizedError("OTP is invalid or has expired");
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedError("Too many attempts, request a new OTP");
    }

    if (challenge.codeHash !== this.hashCode(code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedError("OTP is invalid or has expired");
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.findOrCreateUser(channel, destination);
    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    const tokenHash = this.hashCode(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token is invalid or has expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.userId);
  }

  private async findOrCreateUser(channel: OtpChannel, destination: string) {
    const where = channel === OtpChannel.email ? { email: destination } : { phone: destination };
    const existing = await this.prisma.user.findFirst({ where });
    if (existing) {
      return existing;
    }

    const data =
      channel === OtpChannel.email
        ? { email: destination, status: "active" as const }
        : { phone: destination, status: "active" as const };

    const created = await this.prisma.user.create({ data });

    const customerRole = await this.prisma.role.findUnique({ where: { name: "customer" } });
    if (customerRole) {
      await this.prisma.userRole.create({
        data: { userId: created.id, roleId: customerRole.id },
      });
    }

    return created;
  }

  private async issueTokens(userId: string): Promise<IssuedTokens> {
    const userWithRoles = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    const payload: JwtPayload = {
      sub: userWithRoles.id,
      email: userWithRoles.email,
      phone: userWithRoles.phone,
      roles: userWithRoles.roles.map((userRole) => userRole.role.name),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m",
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_TTL ?? "30d",
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: userWithRoles.id,
        tokenHash: this.hashCode(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }

  private hashCode(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
