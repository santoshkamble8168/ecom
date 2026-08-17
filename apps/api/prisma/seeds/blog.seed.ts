import type { PrismaClient } from "@prisma/client";

const CATEGORIES = [
  { name: "Style Guides", slug: "style-guides" },
  { name: "Behind the Brand", slug: "behind-the-brand" },
];

const TAGS = [
  { name: "Oversized", slug: "oversized" },
  { name: "Streetwear", slug: "streetwear" },
  { name: "Sustainability", slug: "sustainability" },
];

const POSTS = [
  {
    slug: "how-to-style-an-oversized-tee",
    title: "How to Style an Oversized Tee, 5 Ways",
    excerpt: "From layered streetwear to relaxed weekend looks — five ways to wear our oversized fits.",
    authorName: "Editorial Team",
    contentHtml:
      "<p>The oversized tee is a wardrobe staple. Here are five ways to style it for every occasion, from casual weekends to elevated streetwear looks.</p>",
    categorySlug: "style-guides",
    tagSlugs: ["oversized", "streetwear"],
  },
  {
    slug: "our-commitment-to-sustainable-cotton",
    title: "Our Commitment to Sustainable Cotton",
    excerpt: "A look at how we're sourcing better cotton and reducing waste across our supply chain.",
    authorName: "Founder's Desk",
    contentHtml:
      "<p>Sustainability isn't a trend for us — it's a commitment. Here's how we're working with certified mills to reduce water usage and improve fabric quality.</p>",
    categorySlug: "behind-the-brand",
    tagSlugs: ["sustainability"],
  },
  {
    slug: "streetwear-essentials-for-the-new-season",
    title: "Streetwear Essentials for the New Season",
    excerpt: "The pieces topping our list this season, and how to build a capsule wardrobe around them.",
    authorName: "Editorial Team",
    contentHtml:
      "<p>Streetwear is about attitude as much as fit. These are the essentials we're reaching for this season, and how to make them work together.</p>",
    categorySlug: "style-guides",
    tagSlugs: ["streetwear", "oversized"],
  },
];

/**
 * Seeds a small, published blog for Sprint 11 demo purposes: 2 categories,
 * 3 tags, and 3 posts, each linked to at least one category/tag and cross-
 * linked to a couple of real `ProductVariant` SKUs for internal linking.
 * Kept separate from `seed.ts` per the Sprint 11 module boundaries — call
 * `seedBlog(prisma)` from `seed.ts`'s `main()` to wire it in.
 */
export async function seedBlog(prisma: PrismaClient): Promise<void> {
  const categorySlugToId = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categorySlugToId.set(category.slug, created.id);
  }

  const tagSlugToId = new Map<string, string>();
  for (const tag of TAGS) {
    const created = await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
    tagSlugToId.set(tag.slug, created.id);
  }

  const variants = await prisma.productVariant.findMany({
    select: { sku: true },
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  const relatedProductSkus = variants.map((v) => v.sku);

  for (const post of POSTS) {
    const categoryId = categorySlugToId.get(post.categorySlug);
    const tagIds = post.tagSlugs.map((slug) => tagSlugToId.get(slug)).filter((id): id is string => Boolean(id));

    const created = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        authorName: post.authorName,
        contentHtml: post.contentHtml,
        status: "published",
        publishedAt: new Date(),
        relatedProductSkus,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        authorName: post.authorName,
        contentHtml: post.contentHtml,
        status: "published",
        publishedAt: new Date(),
        relatedProductSkus,
      },
    });

    await prisma.blogPostCategory.deleteMany({ where: { blogPostId: created.id } });
    if (categoryId) {
      await prisma.blogPostCategory.create({ data: { blogPostId: created.id, categoryId } });
    }

    await prisma.blogPostTag.deleteMany({ where: { blogPostId: created.id } });
    if (tagIds.length) {
      await prisma.blogPostTag.createMany({ data: tagIds.map((tagId) => ({ blogPostId: created.id, tagId })) });
    }
  }
}
