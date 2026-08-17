"use client";

import type { ExportJobStatus, ExportJobSummary, ReportDefinitionSummary } from "@ecom/types";
import { ReportCard, StatusPill, type StatusPillTone } from "@ecom/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const JOB_TONE: Record<ExportJobStatus, StatusPillTone> = {
  queued: "warning",
  running: "brand",
  completed: "success",
  failed: "danger",
};

function JobStatus({ jobId }: { jobId: string }) {
  const { data: job } = useQuery({
    queryKey: ["admin-export", jobId],
    queryFn: () => apiFetch<ExportJobSummary>(`/admin/exports/${jobId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  if (!job) {
    return <p className="text-sm text-neutral-500">Checking export status…</p>;
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={job.status} tone={JOB_TONE[job.status]} />
        <span className="text-neutral-500">{job.format.toUpperCase()}</span>
      </div>
      {job.rowCount != null ? <p className="text-neutral-500">{job.rowCount} rows</p> : null}
      {job.errorMessage ? <p className="text-danger-600">{job.errorMessage}</p> : null}
      <p className="text-neutral-500">Queued {formatDateTime(job.createdAt)}</p>
      {job.completedAt ? <p className="text-neutral-500">Completed {formatDateTime(job.completedAt)}</p> : null}
    </div>
  );
}

function ReportExportCard({ report }: { report: ReportDefinitionSummary }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ExportJobSummary>(`/admin/reports/${report.id}/export`, {
        method: "POST",
        body: JSON.stringify({ format: "csv" }),
      }),
    onSuccess: (job) => {
      setError(null);
      setJobId(job.id);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <article aria-label={`${report.name} report`} className="flex flex-col gap-2">
      <ReportCard
        name={report.name}
        kind={report.kind.replace(/_/g, " ")}
        description={report.description}
        onExport={() => exportMutation.mutate()}
        exportDisabled={exportMutation.isPending}
      />
      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
      {jobId ? <JobStatus jobId={jobId} /> : null}
    </article>
  );
}

export default function ReportsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => apiFetch<ReportDefinitionSummary[]>("/admin/reports"),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Reports</h1>

      {isLoading && <p className="text-neutral-500">Loading reports…</p>}
      {isError && (
        <p className="text-danger-600">
          {error instanceof Error ? error.message : "Failed to load reports."}
        </p>
      )}

      {data ? (
        data.length === 0 ? (
          <p className="text-neutral-500">No reports available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((report) => (
              <ReportExportCard key={report.id} report={report} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
