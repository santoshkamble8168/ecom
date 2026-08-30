import { cn } from "../lib/cn";

import { Button } from "./button";

export interface TemplateEditorShellProps {
  templateKey: string;
  name: string;
  subject: string;
  body: string;
  requiredVariables?: string[];
  onSubjectChange?: (value: string) => void;
  onBodyChange?: (value: string) => void;
  onPreview?: () => void;
  onTestSend?: () => void;
  previewDisabled?: boolean;
  testSendDisabled?: boolean;
  className?: string;
}

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

/** Presentational template editor: subject, HTML body, variable chips, and action callbacks. */
export function TemplateEditorShell({
  templateKey,
  name,
  subject,
  body,
  requiredVariables = [],
  onSubjectChange,
  onBodyChange,
  onPreview,
  onTestSend,
  previewDisabled,
  testSendDisabled,
  className,
}: TemplateEditorShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs text-neutral-500">{templateKey}</p>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{name}</h2>
      </header>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-subject" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Subject
        </label>
        <input
          id="template-subject"
          type="text"
          value={subject}
          disabled={!onSubjectChange}
          onChange={(event) => onSubjectChange?.(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-body" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Body (HTML)
        </label>
        <textarea
          id="template-body"
          value={body}
          rows={12}
          disabled={!onBodyChange}
          onChange={(event) => onBodyChange?.(event.target.value)}
          className={cn(INPUT_CLASS, "font-mono")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Required variables</p>
        {requiredVariables.length === 0 ? (
          <p className="text-sm text-neutral-500">No required variables.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {requiredVariables.map((variable) => (
              <li
                key={variable}
                className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {`{{${variable}}}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onPreview}
          disabled={previewDisabled || !onPreview}
        >
          Preview
        </Button>
        <Button type="button" variant="secondary" onClick={onTestSend} disabled={testSendDisabled || !onTestSend}>
          Test send
        </Button>
      </div>
    </div>
  );
}
