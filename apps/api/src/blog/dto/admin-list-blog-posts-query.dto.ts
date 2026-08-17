import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const BLOG_POST_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export class AdminListBlogPostsQueryDto {
  @ApiPropertyOptional({ enum: BLOG_POST_STATUSES })
  @IsOptional()
  @IsIn(BLOG_POST_STATUSES)
  status?: (typeof BLOG_POST_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagSlug?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
