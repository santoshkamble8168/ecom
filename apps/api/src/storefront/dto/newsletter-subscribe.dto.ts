import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class NewsletterSubscribeDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
