"use client";

import * as React from "react";
import { useEffect, useId, useRef } from "react";

import { cn } from "../lib/cn";

import { Button } from "./button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the built-in heading when the caller renders its own labelled title. */
  hideTitle?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideTitle = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
      );
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 outline-none sm:mx-4 sm:max-w-md sm:rounded-2xl dark:bg-neutral-950",
          className,
        )}
      >
        <div className={cn("mb-4 flex items-start justify-between gap-4", hideTitle && "mb-0")}>
          <div className={hideTitle ? "sr-only" : undefined}>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "primary"}
          onClick={onConfirm}
          isLoading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
