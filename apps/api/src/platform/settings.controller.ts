import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { PatchSettingsDto } from "./dto/patch-settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("admin-settings")
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  list() {
    return this.settingsService.list();
  }

  @Patch()
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  patch(@CurrentUser() actor: AuthenticatedUser, @Body() dto: PatchSettingsDto) {
    return this.settingsService.patch(actor.id, dto.settings);
  }
}
