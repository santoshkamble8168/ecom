import type { ReactNode } from "react";

export function PolicyDocument({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-display font-bold">{title}</h1>
      <div className="rich-text-content space-y-4 text-neutral-800 dark:text-neutral-200">{children}</div>
    </article>
  );
}
