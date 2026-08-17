import * as React from "react";

import { cn } from "../lib/cn";

import { Button } from "./button";

export interface SettingsFormSetting {
  key: string;
  value: unknown;
}

export type SettingsFormValues = Record<string, string | boolean>;

export interface SettingsFormProps {
  settings: SettingsFormSetting[];
  onSubmit: (values: SettingsFormValues) => void;
  className?: string;
}

function toFormValues(settings: SettingsFormSetting[]): SettingsFormValues {
  return Object.fromEntries(
    settings.map((setting) => [
      setting.key,
      typeof setting.value === "boolean" ? setting.value : String(setting.value ?? ""),
    ]),
  );
}

export function SettingsForm({ settings, onSubmit, className }: SettingsFormProps) {
  const [values, setValues] = React.useState<SettingsFormValues>(() => toFormValues(settings));

  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      {settings.map((setting) => {
        const value = values[setting.key];
        const inputId = `setting-${setting.key}`;

        if (typeof value === "boolean") {
          return (
            <label key={setting.key} className="flex items-center gap-2 text-sm">
              <input
                id={inputId}
                type="checkbox"
                checked={value}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [setting.key]: event.target.checked }))
                }
                className="h-4 w-4 rounded border-neutral-300 accent-brand-600"
              />
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{setting.key}</span>
            </label>
          );
        }

        return (
          <div key={setting.key} className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-neutral-500">
              {setting.key}
            </label>
            <input
              id={inputId}
              type="text"
              value={value ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [setting.key]: event.target.value }))
              }
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
        );
      })}
      <Button type="submit" variant="secondary" className="self-start">
        Save settings
      </Button>
    </form>
  );
}
