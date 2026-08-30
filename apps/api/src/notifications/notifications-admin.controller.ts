import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { CreateTemplateVersionDto } from "./dto/create-template-version.dto";
import { CreateNotificationTemplateDto } from "./dto/create-template.dto";
import { ListDeliveriesQueryDto } from "./dto/list-deliveries-query.dto";
import { PreviewTemplateDto } from "./dto/preview-template.dto";
import { TestSendDto } from "./dto/test-send.dto";
import { UpdateNotificationTemplateDto } from "./dto/update-template.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("admin-notifications")
@Controller("admin/notifications")
export class NotificationsAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("templates")
  @Permissions(PERMISSIONS.NOTIFICATION_READ)
  listTemplates() {
    return this.notifications.listTemplates();
  }

  @Post("templates")
  @Permissions(PERMISSIONS.NOTIFICATION_WRITE)
  createTemplate(@Body() dto: CreateNotificationTemplateDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.notifications.createTemplate(dto, admin.id);
  }

  @Get("templates/:id")
  @Permissions(PERMISSIONS.NOTIFICATION_READ)
  getTemplate(@Param("id") id: string) {
    return this.notifications.getTemplate(id);
  }

  @Patch("templates/:id")
  @Permissions(PERMISSIONS.NOTIFICATION_WRITE)
  updateTemplate(
    @Param("id") id: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.notifications.updateTemplate(id, dto, admin.id);
  }

  @Post("templates/:id/versions")
  @Permissions(PERMISSIONS.NOTIFICATION_WRITE)
  createVersion(
    @Param("id") id: string,
    @Body() dto: CreateTemplateVersionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.notifications.createVersion(id, dto, admin.id);
  }

  @Post("templates/:id/publish")
  @Permissions(PERMISSIONS.NOTIFICATION_WRITE)
  publish(@Param("id") id: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.notifications.publishTemplate(id, admin.id);
  }

  @Post("templates/:id/preview")
  @Permissions(PERMISSIONS.NOTIFICATION_READ)
  preview(@Param("id") id: string, @Body() dto: PreviewTemplateDto) {
    return this.notifications.preview(id, dto.variables, dto.version);
  }

  @Post("templates/:id/test-send")
  @Permissions(PERMISSIONS.NOTIFICATION_WRITE)
  testSend(@Param("id") id: string, @Body() dto: TestSendDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.notifications.testSend(id, dto.destination, dto.variables, admin.id);
  }

  @Get("deliveries")
  @Permissions(PERMISSIONS.NOTIFICATION_READ)
  listDeliveries(@Query() query: ListDeliveriesQueryDto) {
    return this.notifications.listDeliveries(query);
  }
}
