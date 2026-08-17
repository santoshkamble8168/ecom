import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { CustomersService } from "./customers.service";
import { AddCustomerNoteDto } from "./dto/add-customer-note.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";
import { UpdateCustomerStatusDto } from "./dto/update-customer-status.dto";

@ApiTags("admin-customers")
@Controller("admin/customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  list(@Query() query: ListCustomersQueryDto) {
    return this.customersService.list(query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.CUSTOMER_READ)
  getById(@Param("id") id: string) {
    return this.customersService.getById(id);
  }

  @Post(":id/notes")
  @Permissions(PERMISSIONS.CUSTOMER_WRITE)
  addNote(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AddCustomerNoteDto,
  ) {
    return this.customersService.addNote(actor.id, id, dto.body);
  }

  @Patch(":id/status")
  @Permissions(PERMISSIONS.CUSTOMER_WRITE)
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.customersService.updateStatus(actor.id, id, dto.status);
  }
}
