import { NotFoundError, ValidationError } from "@ecom/shared";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";

import { CustomersService } from "./customers.service";

const CREATED_AT = new Date("2026-01-15T10:00:00.000Z");

function listUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "ada@ecom.local",
    phone: "9990001111",
    displayName: "Ada Lovelace",
    status: "active",
    createdAt: CREATED_AT,
    _count: { orders: 2 },
    orders: [{ createdAt: new Date("2026-08-01T00:00:00.000Z") }],
    ...overrides,
  };
}

function detailUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "ada@ecom.local",
    phone: "9990001111",
    displayName: "Ada Lovelace",
    status: "active",
    createdAt: CREATED_AT,
    profile: { preferences: { newsletter: true } },
    addresses: [
      {
        id: "addr-1",
        label: "Home",
        fullName: "Ada Lovelace",
        phone: "9990001111",
        line1: "1 Analytical Engine Rd",
        line2: null,
        city: "London",
        state: "LDN",
        postalCode: "SW1A 1AA",
        country: "GB",
        isDefault: true,
      },
    ],
    orders: [
      {
        id: "ord-1",
        orderNumber: "ECOM-1001",
        status: "delivered",
        total: { toString: () => "150.50" },
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ],
    returnRequests: [
      { id: "ret-1", status: "requested", createdAt: new Date("2026-08-10T00:00:00.000Z") },
    ],
    reviews: [
      {
        id: "rev-1",
        productId: "prod-1",
        rating: 5,
        title: "Great",
        status: "published",
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
      },
    ],
    loyaltyAccount: { pointsBalance: 120 },
    supportNotes: [
      {
        id: "note-1",
        body: "Called about sizing",
        authorId: "admin-1",
        createdAt: new Date("2026-08-12T00:00:00.000Z"),
        author: { email: "admin@ecom.local" },
      },
    ],
    ...overrides,
  };
}

describe("CustomersService", () => {
  let service: CustomersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    order: { groupBy: jest.Mock };
    customerSupportNote: { create: jest.Mock };
    auditLog: { findMany: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
      customerSupportNote: { create: jest.fn().mockResolvedValue({ id: "note-2" }) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new CustomersService(prisma as unknown as PrismaService, audit as unknown as AuditService);
  });

  describe("list", () => {
    it("scopes to customers-or-order-holders and maps search plus status filters", async () => {
      prisma.user.findMany.mockResolvedValue([listUser()]);
      prisma.user.count.mockResolvedValue(1);
      prisma.order.groupBy.mockResolvedValue([
        { userId: "user-1", _sum: { total: { toString: () => "150.5" } } },
      ]);

      const result = await service.list({ q: "ada", status: "active", page: 2, pageSize: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          where: {
            AND: [
              {
                OR: [
                  { roles: { some: { role: { name: "customer" } } } },
                  { orders: { some: {} } },
                ],
              },
              { status: "active" },
              {
                OR: [
                  { email: { contains: "ada", mode: "insensitive" } },
                  { phone: { contains: "ada", mode: "insensitive" } },
                  { displayName: { contains: "ada", mode: "insensitive" } },
                ],
              },
            ],
          },
        }),
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.customers[0]).toMatchObject({
        id: "user-1",
        email: "ada@ecom.local",
        status: "active",
        orderCount: 2,
        lifetimeValue: "150.50",
        lastOrderAt: "2026-08-01T00:00:00.000Z",
      });
    });

    it("defaults lifetime value to 0.00 when the customer has no paid orders", async () => {
      prisma.user.findMany.mockResolvedValue([listUser()]);
      prisma.user.count.mockResolvedValue(1);
      prisma.order.groupBy.mockResolvedValue([]);

      const result = await service.list({});

      expect(result.customers[0].lifetimeValue).toBe("0.00");
    });
  });

  describe("getById", () => {
    it("throws NotFoundError when the customer is missing", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it("assembles profile, orders, notes, and a newest-first timeline", async () => {
      prisma.user.findUnique.mockResolvedValue(detailUser());
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: "aud-1",
          action: "customer.status_changed",
          createdAt: new Date("2026-08-16T00:00:00.000Z"),
          before: { status: "pending_verification" },
          after: { status: "active" },
        },
      ]);

      const result = await service.getById("user-1");

      expect(result.profile.preferences).toEqual({ newsletter: true });
      expect(result.loyaltyPoints).toBe(120);
      expect(result.notes[0].authorEmail).toBe("admin@ecom.local");
      expect(result.timeline[0]).toMatchObject({ kind: "status", title: "Status changed" });
    });
  });

  describe("addNote", () => {
    it("creates a note, writes an audit log, and returns the detail", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "user-1" })
        .mockResolvedValueOnce(detailUser());

      const result = await service.addNote("admin-1", "user-1", "Called about sizing");

      expect(prisma.customerSupportNote.create).toHaveBeenCalledWith({
        data: { userId: "user-1", authorId: "admin-1", body: "Called about sizing" },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          action: "customer.note_added",
          entityType: "user",
          entityId: "user-1",
        }),
      );
      expect(result.id).toBe("user-1");
    });

    it("throws NotFoundError before writing a note", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.addNote("admin-1", "missing", "hello")).rejects.toThrow(NotFoundError);
      expect(prisma.customerSupportNote.create).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates status and audits before/after values", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: "user-1", status: "active" })
        .mockResolvedValueOnce(detailUser({ status: "suspended" }));
      prisma.user.update.mockResolvedValue({ id: "user-1", status: "suspended" });

      const result = await service.updateStatus("admin-1", "user-1", "suspended");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { status: "suspended" },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          action: "customer.status_changed",
          entityType: "user",
          entityId: "user-1",
          before: { status: "active" },
          after: { status: "suspended" },
        }),
      );
      expect(result.status).toBe("suspended");
    });

    it("throws NotFoundError when the customer is missing", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus("admin-1", "missing", "suspended")).rejects.toThrow(
        NotFoundError,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("rejects statuses other than active or suspended", async () => {
      await expect(
        service.updateStatus("admin-1", "user-1", "pending_verification" as "active"),
      ).rejects.toThrow(ValidationError);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
