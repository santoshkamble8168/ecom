"use client";

import type { CollectionSummary } from "@ecom/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { INPUT_CLASS } from "@/lib/form-styles";

export function CollectionSearchField({
  id,
  label = "Collection",
  value,
  onChange,
  onPick,
  error,
  excludeIds,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (query: string) => void;
  onPick: (collection: CollectionSummary) => void;
  error?: string;
  excludeIds?: string[];
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiFetch<CollectionSummary[]>("/admin/collections"),
  });

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const excluded = new Set(excludeIds ?? []);
    return collections
      .filter((collection) => collection.isActive && !excluded.has(collection.id))
      .filter((collection) => {
        if (!q) return true;
        return collection.name.toLowerCase().includes(q) || collection.slug.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [collections, excludeIds, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder="Search collections by name"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={INPUT_CLASS}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-neutral-500">No matching collections.</li>
          ) : (
            matches.map((collection) => (
              <li key={collection.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onPick(collection);
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{collection.name}</span>
                  <span className="font-mono text-xs text-neutral-500">{collection.slug}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </div>
  );
}
