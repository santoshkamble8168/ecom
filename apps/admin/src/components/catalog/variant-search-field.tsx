"use client";

import { useEffect, useId, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { INPUT_CLASS } from "@/lib/form-styles";

export interface VariantSearchHit {
  sku: string;
  productTitle: string;
  productSlug: string;
  price: string;
  options: Array<{ attributeName: string; value: string }>;
}

function optionLabel(hit: VariantSearchHit): string {
  const opts = hit.options.map((option) => option.value).join(" / ");
  return opts ? `${hit.productTitle} — ${opts}` : hit.productTitle;
}

export function VariantSearchField({
  id,
  label,
  value,
  onChange,
  onPick,
  error,
  disabled,
  placeholder = "Search by product name or SKU",
  excludeSkus,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (sku: string) => void;
  onPick?: (hit: VariantSearchHit) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  excludeSkus?: string[];
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const [hits, setHits] = useState<VariantSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const excludeKey = (excludeSkus ?? []).join(",");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!open || debounced.length < 1) {
      setHits([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void apiFetch<VariantSearchHit[]>(`/admin/variants?search=${encodeURIComponent(debounced)}&pageSize=12`)
      .then((items) => {
        if (cancelled) return;
        const excluded = new Set(excludeKey ? excludeKey.split(",") : []);
        setHits(items.filter((item) => !excluded.has(item.sku)));
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, excludeKey, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(hit: VariantSearchHit) {
    onChange(hit.sku);
    onPick?.(hit);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <label htmlFor={inputId} className="font-medium">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={INPUT_CLASS}
      />
      {open && (loading || hits.length > 0 || debounced.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {loading && <li className="px-3 py-2 text-neutral-500">Searching…</li>}
          {!loading && hits.length === 0 && debounced.length > 0 && (
            <li className="px-3 py-2 text-neutral-500">No matching products. You can still type a SKU.</li>
          )}
          {hits.map((hit) => (
            <li key={hit.sku} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(hit)}
              >
                <span className="font-medium">{optionLabel(hit)}</span>
                <span className="font-mono text-xs text-neutral-500">{hit.sku}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="text-xs text-danger-600">{error}</p> : null}
    </div>
  );
}
