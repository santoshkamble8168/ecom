import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateBlogPostDto {
  @ApiProperty({ example: "styling-oversized-tees" })
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: "slug must be lowercase, URL-safe, and hyphen-separated (e.g. my-post-title)",
  })
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  authorName!: string;

  @ApiProperty()
  @IsString()
  contentHtml!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoCanonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoOgImage?: string;

  @ApiPropertyOptional({ type: [String], description: "BlogCategory ids to link this post to" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "BlogTag ids to link this post to" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "ProductVariant SKUs to show as related products" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductSkus?: string[];
}

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}
