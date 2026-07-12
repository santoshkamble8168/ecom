import { createHash, randomInt } from "node:crypto";

import { UnauthorizedError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OAuthProvider, OtpChannel } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { AppLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

import { isDevDemoOtpBypass } from "./demo-accounts";
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
    private readonly audit: AuditService,
    private readonly usersService: UsersService,
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
    if (channel === OtpChannel.email && isDevDemoOtpBypass(destination, code)) {
      const user = await this.prisma.user.findFirst({ where: { email: destination } });
      if (!user) {
        throw new UnauthorizedError("Demo account not found — run the database seed");
      }
      this.logger.log(`Demo OTP bypass used for ${destination}`);
      await this.audit.log({
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        metadata: { method: "otp_demo_bypass", channel },
      });
      return this.issueTokens(user.id);
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { channel, destination, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      await this.audit.log({
        action: "auth.otp_failed",
        entityType: "otp_challenge",
        metadata: { channel, destination, reason: "missing_or_expired" },
      });
      throw new UnauthorizedError("OTP is invalid or has expired");
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await this.audit.log({
        action: "auth.otp_failed",
        entityType: "otp_challenge",
        entityId: challenge.id,
        metadata: { channel, destination, reason: "max_attempts" },
      });
      throw new UnauthorizedError("Too many attempts, request a new OTP");
    }

    if (challenge.codeHash !== this.hashCode(code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      await this.audit.log({
        action: "auth.otp_failed",
        entityType: "otp_challenge",
        entityId: challenge.id,
        metadata: { channel, destination, reason: "code_mismatch" },
      });
      throw new UnauthorizedError("OTP is invalid or has expired");
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.findOrCreateUser(channel, destination);
    await this.usersService.ensureProfile(user.id);
    await this.audit.log({
      userId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { method: "otp", channel },
    });
    return this.issueTokens(user.id);
  }

  async logout(refreshToken: string, userId?: string): Promise<void> {
    const tokenHash = this.hashCode(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.log({
      userId: userId ?? stored?.userId,
      action: "auth.logout",
      entityType: "user",
      entityId: userId ?? stored?.userId,
    });
  }

  async googleAuth(idToken: string): Promise<IssuedTokens> {
    const googleUser = await this.verifyGoogleIdToken(idToken);
    let user = await this.prisma.user.findFirst({ where: { email: googleUser.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: googleUser.email, displayName: googleUser.name, status: "active" },
      });
      const customerRole = await this.prisma.role.findUnique({ where: { name: "customer" } });
      if (customerRole) {
        await this.prisma.userRole.create({
          data: { userId: user.id, roleId: customerRole.id },
        });
      }
    }

    await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: OAuthProvider.google,
          providerUserId: googleUser.sub,
        },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        provider: OAuthProvider.google,
        providerUserId: googleUser.sub,
      },
    });

    await this.usersService.ensureProfile(user.id);

    await this.audit.log({
      userId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      metadata: { method: "google" },
    });

    return this.issueTokens(user.id);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    email: string;
    sub: string;
    name: string | null;
  }> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedError("Invalid Google token");
    }

    const payload = (await response.json()) as {
      email?: string;
      sub?: string;
      name?: string;
      aud?: string;
    };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      throw new UnauthorizedError("Invalid Google token audience");
    }

    if (!payload.email || !payload.sub) {
      throw new UnauthorizedError("Google token is missing required claims");
    }

    return { email: payload.email, sub: payload.sub, name: payload.name ?? null };
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

    await this.usersService.ensureProfile(created.id);

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
