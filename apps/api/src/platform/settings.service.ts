import type { PlatformSetting } from "@ecom/types";
import { Injectable } from "@nestjs/common";
import type { Prisma, Setting as SettingModel } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import { validateSettingsPatch } from "./settings.policy";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<PlatformSetting[]> {
    const settings = await this.prisma.setting.findMany({
      orderBy: { key: "asc" },
    });
    return settings.map((setting) => this.toSetting(setting));
  }

  async patch(actorId: string, settings: Record<string, unknown>): Promise<PlatformSetting[]> {
    const validated = validateSettingsPatch(settings);
    const keys = Object.keys(validated);

    if (keys.length === 0) {
      return this.list();
    }

    const existing = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const existingByKey = new Map(existing.map((row) => [row.key, row.value]));

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    for (const [key, nextValue] of Object.entries(validated)) {
      const previous = existingByKey.has(key) ? existingByKey.get(key) : undefined;
      if (jsonEqual(previous, nextValue)) continue;
      if (previous !== undefined) before[key] = previous;
      after[key] = nextValue;
    }

    await this.prisma.$transaction(
      Object.entries(validated).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          create: { key, value: toJson(value) },
          update: { value: toJson(value) },
        }),
      ),
    );

    if (Object.keys(after).length > 0) {
      await this.audit.log({
        userId: actorId,
        action: "settings.updated",
        entityType: "settings",
        before: before as unknown as Prisma.InputJsonValue,
        after: after as unknown as Prisma.InputJsonValue,
      });
    }

    return this.list();
  }

  private toSetting(setting: SettingModel): PlatformSetting {
    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toJson(value: string | boolean): Prisma.InputJsonValue {
  return value;
}
