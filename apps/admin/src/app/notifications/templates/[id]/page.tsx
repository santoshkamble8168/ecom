"use client";

import type {
  NotificationPreviewResult,
  NotificationTemplateDetail,
  NotificationTemplateVersion,
} from "@ecom/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CONTENT_STATUS_PILLS,
  RichHtml,
  StatusPill,
  TemplateEditorShell,
} from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function latestVersion(template: NotificationTemplateDetail): NotificationTemplateVersion | undefined {
  return (
    template.versions.find((version) => version.version === template.latestVersion) ??
    template.versions.at(-1)
  );
}

function parseVariables(json: string): Record<string, unknown> | null {
  const trimmed = json.trim();
  if (!trimmed) return {};
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export default function NotificationTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;
  const queryClient = useQueryClient();

  const { data: template, isLoading, isError, error } = useQuery({
    queryKey: ["admin-notification-template", templateId],
    queryFn: () => apiFetch<NotificationTemplateDetail>(`/admin/notifications/templates/${templateId}`),
    enabled: Boolean(templateId),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">{template?.name ?? "Template"}</h1>
        <Link href="/notifications/templates" className="text-sm text-brand-600 hover:underline">
          ← Back to templates
        </Link>
      </div>

      {isLoading && <p className="text-neutral-500">Loading template…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load template."}
        </p>
      )}

      {template ? (
        <TemplateDetailBody
          key={`${template.id}:${template.updatedAt}`}
          template={template}
          onInvalidate={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin-notification-template", templateId] });
            void queryClient.invalidateQueries({ queryKey: ["admin-notification-templates"] });
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateDetailBody({
  template,
  onInvalidate,
}: {
  template: NotificationTemplateDetail;
  onInvalidate: () => void;
}) {
  const initial = latestVersion(template);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [variablesJson, setVariablesJson] = useState(() =>
    JSON.stringify(Object.fromEntries(template.requiredVariables.map((key) => [key, ""])), null, 2),
  );
  const [destination, setDestination] = useState("");
  const [previewVersion, setPreviewVersion] = useState(
    template.latestVersion != null ? String(template.latestVersion) : "",
  );
  const [preview, setPreview] = useState<NotificationPreviewResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    setSuccess(null);
  }, [name, description, subject, body, variablesJson, destination]);

  const metaMutation = useMutation({
    mutationFn: () =>
      apiFetch<NotificationTemplateDetail>(`/admin/notifications/templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      }),
    onSuccess: () => {
      setFormError(null);
      setSuccess("Template details saved.");
      onInvalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const versionMutation = useMutation({
    mutationFn: () =>
      apiFetch<NotificationTemplateVersion>(`/admin/notifications/templates/${template.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ subject, body }),
      }),
    onSuccess: () => {
      setFormError(null);
      setSuccess("New version saved.");
      onInvalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiFetch<NotificationTemplateDetail>(`/admin/notifications/templates/${template.id}/publish`, {
        method: "POST",
      }),
    onSuccess: () => {
      setFormError(null);
      setSuccess("Template published.");
      onInvalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const previewMutation = useMutation({
    mutationFn: (variables: Record<string, unknown>) =>
      apiFetch<NotificationPreviewResult>(`/admin/notifications/templates/${template.id}/preview`, {
        method: "POST",
        body: JSON.stringify({
          variables,
          ...(previewVersion ? { version: Number(previewVersion) } : {}),
        }),
      }),
    onSuccess: (result) => {
      setFormError(null);
      setPreview(result);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const testSendMutation = useMutation({
    mutationFn: ({ dest, variables }: { dest: string; variables: Record<string, unknown> }) =>
      apiFetch(`/admin/notifications/templates/${template.id}/test-send`, {
        method: "POST",
        body: JSON.stringify({ destination: dest, variables }),
      }),
    onSuccess: () => {
      setFormError(null);
      setSuccess("Test send queued.");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  function resolveVariables(): Record<string, unknown> | null {
    const parsed = parseVariables(variablesJson);
    if (!parsed) {
      setFormError("Preview variables must be a JSON object.");
      return null;
    }
    return parsed;
  }

  function handlePreview() {
    const variables = resolveVariables();
    if (!variables) return;
    previewMutation.mutate(variables);
  }

  function handleTestSend() {
    const dest = destination.trim();
    if (!dest) {
      setFormError("Enter a test destination.");
      return;
    }
    const variables = resolveVariables();
    if (!variables) return;
    testSendMutation.mutate({ dest, variables });
  }

  const statusPill = CONTENT_STATUS_PILLS[template.status] ?? {
    label: template.status,
    tone: "neutral" as const,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        <span className="font-mono">{template.key}</span>
        <StatusPill label={statusPill.label} tone={statusPill.tone} />
        <span>{template.channel}</span>
        <span>{template.category}</span>
      </div>

      {formError ? <p className="text-sm text-danger-600">{formError}</p> : null}
      {success ? <p className="text-sm text-success-600">{success}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={INPUT_CLASS}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => metaMutation.mutate()}
            disabled={metaMutation.isPending}
          >
            {metaMutation.isPending ? "Saving…" : "Save details"}
          </Button>
        </CardContent>
      </Card>

      <TemplateEditorShell
        templateKey={template.key}
        name={name}
        subject={subject}
        body={body}
        requiredVariables={template.requiredVariables}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
        onPreview={handlePreview}
        onTestSend={handleTestSend}
        previewDisabled={previewMutation.isPending}
        testSendDisabled={testSendMutation.isPending}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => versionMutation.mutate()}
          disabled={versionMutation.isPending}
        >
          {versionMutation.isPending ? "Saving…" : "Save new version"}
        </Button>
        <Button type="button" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
          {publishMutation.isPending ? "Publishing…" : "Publish"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview &amp; test send</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preview variables (JSON)</span>
            <textarea
              value={variablesJson}
              onChange={(event) => setVariablesJson(event.target.value)}
              rows={8}
              className={`${INPUT_CLASS} font-mono`}
            />
          </label>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Preview version</span>
              <input
                type="number"
                min={1}
                value={previewVersion}
                onChange={(event) => setPreviewVersion(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Test destination</span>
              <input
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="email or phone"
                className={INPUT_CLASS}
              />
            </label>
          </div>
          {preview ? (
            <div className="lg:col-span-2 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Subject: <span className="font-normal">{preview.subject ?? "—"}</span>
              </p>
              <div className="mt-3">
                <RichHtml html={preview.body} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {template.versions.length === 0 ? (
            <p className="text-sm text-neutral-500">No versions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-500">
                      Version
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-500">
                      Subject
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-500">
                      Created by
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-500">
                      Created
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...template.versions]
                    .sort((a, b) => b.version - a.version)
                    .map((version) => (
                      <tr key={version.id} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="px-3 py-2">{version.version}</td>
                        <td className="px-3 py-2 text-neutral-500">{version.subject ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-500">{version.createdBy ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-500">{formatDateTime(version.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubject(version.subject ?? "");
                              setBody(version.body);
                              setPreviewVersion(String(version.version));
                            }}
                          >
                            Load
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
