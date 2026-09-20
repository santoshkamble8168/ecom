import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class NewsletterSubscribeDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Hidden honeypot — humans leave this empty. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
