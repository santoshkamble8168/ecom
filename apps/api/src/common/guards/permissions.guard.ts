import { ForbiddenError } from "@ecom/shared";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import type { AuthenticatedUser } from "../../auth/types/authenticated-user";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    const userPermissions = await this.resolvePermissions(user.roles);
    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenError("Insufficient permissions");
    }

    return true;
  }

  private async resolvePermissions(roles: string[]): Promise<string[]> {
    const roleRecords = await this.prisma.role.findMany({
      where: { name: { in: roles } },
      include: { permissions: { include: { permission: true } } },
    });

    const keys = new Set<string>();
    for (const role of roleRecords) {
      for (const rp of role.permissions) {
        keys.add(rp.permission.key);
      }
    }
    return [...keys];
  }
}
