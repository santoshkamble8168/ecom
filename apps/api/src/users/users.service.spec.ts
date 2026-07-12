import { NotFoundError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    customerProfile: { upsert: jest.Mock; create: jest.Mock };
    address: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      customerProfile: {
        upsert: jest.fn(),
        create: jest.fn(),
      },
      address: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new UsersService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  it("returns a user profile with roles and preferences", async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      email: "customer@ecom.local",
      phone: null,
      displayName: "Demo Customer",
      status: "active",
      roles: [{ role: { name: "customer" } }],
      profile: { preferences: { newsletter: true } },
    });

    const profile = await service.getProfile("user-1");

    expect(profile.email).toBe("customer@ecom.local");
    expect(profile.roles).toEqual(["customer"]);
    expect(profile.profile.preferences.newsletter).toBe(true);
  });

  it("throws when deleting a missing address", async () => {
    prisma.address.findFirst.mockResolvedValue(null);

    await expect(service.deleteAddress("user-1", "missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
