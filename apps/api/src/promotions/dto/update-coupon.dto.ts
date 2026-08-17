import { PartialType } from "@nestjs/swagger";

import { UpsertCouponDto } from "./upsert-coupon.dto";

export class UpdateCouponDto extends PartialType(UpsertCouponDto) {}
