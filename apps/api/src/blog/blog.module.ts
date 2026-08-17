import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";

import { BlogAdminController } from "./blog-admin.controller";
import { BlogController } from "./blog.controller";
import { BlogService } from "./blog.service";

@Module({
  imports: [AuditModule],
  controllers: [BlogController, BlogAdminController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
