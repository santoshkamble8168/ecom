import type { ApiResponse, BlogPostDetail, ProductSummary } from "@ecom/types";
import { jsonLdArticle, jsonLdBreadcrumb } from "@ecom/shared";
import { ProductCard } from "@ecom/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichHtml } from "@/components/cms/rich-html";
import { JsonLd } from "@/components/seo/json-ld";
import { apiFetch } from "@/lib/api";
import { getApiUrl } from "@/lib/api-url";
import { absoluteUrl, siteOrigin } from "@/lib/seo";

const API_URL = getApiUrl();

async function getRelatedProducts(skus: string[]): Promise<ProductSummary[]> {
  if (skus.length === 0) return [];
  try {
    return await apiFetch<ProductSummary[]>(`/products/by-sku?skus=${skus.map(encodeURIComponent).join(",")}`);
  } catch (err) {
    console.error("[Blog] Failed to load related products:", err);
    return [];
  }
}

async function getPost(slug: string): Promise<BlogPostDetail | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/blog/posts/${slug}`, { next: { revalidate: 60 } });
  } catch (err) {
    console.error(`[Blog] Failed to reach API for "${slug}":`, err);
    return null;
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[Blog] API returned ${res.status} for "${slug}"`);
    return null;
  }

  try {
    const body = (await res.json()) as ApiResponse<BlogPostDetail>;
    if (!body.success) return null;
    return body.data;
  } catch (err) {
    console.error(`[Blog] Failed to parse API response for "${slug}":`, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found", robots: { index: false } };

  const path = `/blog/${post.slug}`;
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    alternates: { canonical: post.seoCanonicalUrl ?? path },
    openGraph: post.seoOgImage
      ? { title: post.seoTitle ?? post.title, images: [post.seoOgImage] }
      : { title: post.seoTitle ?? post.title },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const relatedProducts = await getRelatedProducts(post.relatedProductSkus);
  const origin = siteOrigin();
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd
        data={[
          jsonLdArticle({
            headline: post.title,
            description: post.excerpt,
            image: post.coverImageUrl ?? post.seoOgImage,
            url,
            datePublished: post.publishedAt,
            authorName: post.authorName,
          }),
          jsonLdBreadcrumb([
            { name: "Home", url: origin },
            { name: "Blog", url: absoluteUrl("/blog") },
            { name: post.title, url },
          ]),
        ]}
      />
      <nav className="mb-3 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <Link href="/blog" className="hover:underline">
          Blog
        </Link>
        {" / "}
        <span className="text-neutral-900 dark:text-neutral-200">{post.title}</span>
      </nav>

      {post.categories.length > 0 && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          {post.categories.map((c) => c.name).join(", ")}
        </p>
      )}
      <h1 className="text-3xl font-display font-bold sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-sm text-neutral-500">
        By {post.authorName}
        {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
      </p>

      {post.coverImageUrl && (
        <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}

      <RichHtml html={post.contentHtml} className="mt-8" />

      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          {post.tags.map((t) => (
            <Link
              key={t.slug}
              href={`/blog?tag=${t.slug}`}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {relatedProducts.length > 0 && (
        <div className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <h2 className="mb-4 text-lg font-display font-bold">Shop the look</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {relatedProducts.map((product) => (
              <Link key={product.slug} href={`/products/${product.slug}`}>
                <ProductCard product={product} showStatus={false} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
