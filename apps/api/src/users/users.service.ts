import type { CustomerAddress, CustomerPreferences, UserProfile } from "@ecom/types";
import { NotFoundError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";
import type { Address, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CreateAddressDto } from "./dto/create-address.dto";
import type { UpdateAddressDto } from "./dto/update-address.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        profile: true,
      },
    });

    return this.toUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
      },
      include: {
        roles: { include: { role: true } },
        profile: true,
      },
    });

    if (dto.preferences) {
      const existing = user.profile?.preferences ?? {};
      await this.prisma.customerProfile.upsert({
        where: { userId },
        update: {
          preferences: { ...(existing as object), ...dto.preferences } as Prisma.InputJsonValue,
        },
        create: {
          userId,
          preferences: dto.preferences as Prisma.InputJsonValue,
        },
      });
    } else if (!user.profile) {
      await this.prisma.customerProfile.create({
        data: { userId, preferences: {} },
      });
    }

    await this.audit.log({
      userId,
      action: "profile.updated",
      entityType: "user",
      entityId: userId,
      metadata: { fields: Object.keys(dto) },
    });

    return this.getProfile(userId);
  }

  async listAddresses(userId: string): Promise<CustomerAddress[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return addresses.map((address) => this.toAddress(address));
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label,
        fullName: dto.fullName,
        phone: dto.phone,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country ?? "IN",
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.audit.log({
      userId,
      action: "address.created",
      entityType: "address",
      entityId: address.id,
    });

    return this.toAddress(address);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddress> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      throw new NotFoundError("Address not found");
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    await this.audit.log({
      userId,
      action: "address.updated",
      entityType: "address",
      entityId: addressId,
    });

    return this.toAddress(address);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      throw new NotFoundError("Address not found");
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    await this.audit.log({
      userId,
      action: "address.deleted",
      entityType: "address",
      entityId: addressId,
    });
  }

  async ensureProfile(userId: string): Promise<void> {
    await this.prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, preferences: {} },
    });
  }

  private toUserProfile(
    user: Prisma.UserGetPayload<{ include: { roles: { include: { role: true } }; profile: true } }>,
  ): UserProfile {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.name),
      profile: {
        preferences: (user.profile?.preferences ?? {}) as CustomerPreferences,
      },
    };
  }

  private toAddress(address: Address): CustomerAddress {
    return {
      id: address.id,
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }
}
