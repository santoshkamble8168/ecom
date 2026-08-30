import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";

import { PatchNotificationPreferencesDto } from "./dto/patch-preferences.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("me-notifications")
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("me/notification-preferences")
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.getPreferences(user.id);
  }

  @Patch("me/notification-preferences")
  updatePreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: PatchNotificationPreferencesDto) {
    return this.notifications.updatePreferences(user.id, dto);
  }
}
