"use client";

import { Button } from "@ecom/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function AddNoteForm({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/admin/customers/${customerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      }),
    onSuccess: () => {
      setBody("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Note</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={2000}
          className={INPUT_CLASS}
          required
        />
      </label>
      <div>
        <Button type="submit" size="sm" disabled={mutation.isPending || !body.trim()}>
          {mutation.isPending ? "Adding…" : "Add note"}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
    </form>
  );
}
