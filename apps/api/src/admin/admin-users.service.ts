import type { AdminUserSummary, RoleSummary } from "@ecom/types";
import { NotFoundError } from "@ecom/shared";
import { Injectable } from "@nestjs/common";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listUsers(): Promise<AdminUserSummary[]> {
    const users = await this.prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.name),
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async listRoles(): Promise<RoleSummary[]> {
    const roles = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionKeys: role.permissions.map((rp) => rp.permission.key),
    }));
  }

  async assignRoles(
    actorId: string,
    userId: string,
    roleNames: string[],
  ): Promise<AdminUserSummary> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
    });
    if (roles.length !== roleNames.length) {
      throw new NotFoundError("One or more roles not found");
    }

    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id })),
    });

    await this.audit.log({
      userId: actorId,
      action: "user.roles_assigned",
      entityType: "user",
      entityId: userId,
      metadata: { roleNames },
    });

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    return {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      displayName: updated.displayName,
      status: updated.status,
      roles: updated.roles.map((userRole) => userRole.role.name),
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
