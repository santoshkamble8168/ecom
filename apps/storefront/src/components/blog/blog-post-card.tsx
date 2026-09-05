import type { BlogPostSummary } from "@ecom/types";
import Link from "next/link";

import { StorefrontImage } from "@/components/media/storefront-image";

export function BlogPostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
        {post.coverImageUrl ? (
          <StorefrontImage
            src={post.coverImageUrl}
            alt={post.title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">No image</div>
        )}
      </div>
      <div className="mt-3">
        {post.categories[0] && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {post.categories[0].name}
          </p>
        )}
        <h3 className="mt-1 line-clamp-2 text-lg font-display font-bold group-hover:underline">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500">{post.excerpt}</p>
        )}
        <p className="mt-2 text-xs text-neutral-400">
          By {post.authorName}
          {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
        </p>
      </div>
    </Link>
  );
}
