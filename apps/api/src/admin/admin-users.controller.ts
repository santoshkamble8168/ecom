import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { AdminUsersService } from "./admin-users.service";

@ApiTags("admin-users")
@Controller("admin")
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get("users")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listUsers() {
    return this.adminUsersService.listUsers();
  }

  @Get("roles")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  listRoles() {
    return this.adminUsersService.listRoles();
  }

  @Patch("users/:id/roles")
  @Permissions(PERMISSIONS.ADMIN_ACCESS)
  assignRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") userId: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.adminUsersService.assignRoles(actor.id, userId, dto.roleNames);
  }
}
