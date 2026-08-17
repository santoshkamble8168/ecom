import { cn } from "../lib/cn";

export interface BlogCardProps {
  href: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  categoryName?: string | null;
  authorName: string;
  publishedAt?: string | null;
  className?: string;
}

export function BlogCard({
  href,
  title,
  excerpt,
  coverImageUrl,
  categoryName,
  authorName,
  publishedAt,
  className,
}: BlogCardProps) {
  return (
    <a href={href} className={cn("group block", className)}>
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">No image</div>
        )}
      </div>
      <div className="mt-3">
        {categoryName && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{categoryName}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-lg font-display font-bold group-hover:underline">{title}</h3>
        {excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500">{excerpt}</p>}
        <p className="mt-2 text-xs text-neutral-400">
          By {authorName}
          {publishedAt ? ` · ${new Date(publishedAt).toLocaleDateString()}` : ""}
        </p>
      </div>
    </a>
  );
}
