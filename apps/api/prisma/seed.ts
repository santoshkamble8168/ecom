import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "catalog:read", description: "View catalog data" },
  { key: "catalog:write", description: "Manage catalog data" },
  { key: "order:read", description: "View orders" },
  { key: "order:write", description: "Manage orders" },
  { key: "admin:access", description: "Access the admin dashboard" },
  { key: "user:read", description: "View users and roles" },
  { key: "user:write", description: "Manage users and role assignments" },
];

const ROLES: Array<{ name: string; description: string; permissionKeys: string[] }> = [
  { name: "customer", description: "Storefront customer", permissionKeys: [] },
  {
    name: "admin",
    description: "Full administrative access",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "catalog_manager",
    description: "Manages catalog content",
    permissionKeys: ["catalog:read", "catalog:write", "admin:access"],
  },
  {
    name: "customer_support",
    description: "Handles customer support and orders",
    permissionKeys: ["order:read", "order:write", "user:read", "admin:access"],
  },
  {
    name: "marketing_manager",
    description: "Manages campaigns and storefront content",
    permissionKeys: ["catalog:read", "admin:access"],
  },
];

const FEATURE_FLAGS = [
  { key: "search.meilisearch", isEnabled: false, description: "Enable Meilisearch-backed search" },
  { key: "payments.razorpay", isEnabled: false, description: "Enable Razorpay checkout" },
];

const ATTRIBUTES = [
  {
    key: "size",
    name: "Size",
    values: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    key: "color",
    name: "Color",
    values: ["Black", "White", "Navy", "Red", "Olive", "Mustard"],
  },
  {
    key: "fit",
    name: "Fit",
    values: ["Regular", "Oversized", "Slim"],
  },
];

const CATEGORIES = [
  { name: "Men", slug: "men", sortOrder: 1 },
  { name: "Women", slug: "women", sortOrder: 2 },
  { name: "T-Shirts", slug: "men-t-shirts", parentSlug: "men", sortOrder: 1 },
  { name: "T-Shirts", slug: "women-t-shirts", parentSlug: "women", sortOrder: 1 },
];

const COLLECTIONS = [
  { name: "New Arrivals", slug: "new-arrivals", description: "Latest drops and fresh styles" },
  { name: "Best Sellers", slug: "best-sellers", description: "Top-rated customer favorites" },
  { name: "Graphic Tees", slug: "graphic-tees", description: "Bold prints and statement graphics" },
];

const SAMPLE_PRODUCTS = [
  {
    title: "Classic Crew Neck T-Shirt",
    slug: "classic-crew-neck-tee",
    brand: "ECOM",
    description: "Soft cotton crew neck tee for everyday wear.",
    basePrice: "499.00",
    compareAtPrice: "799.00",
    categorySlugs: ["men-t-shirts"],
    collectionSlugs: ["new-arrivals", "best-sellers"],
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
    variants: [
      { sku: "CCN-BLK-M", price: "499.00", size: "m", color: "black" },
      { sku: "CCN-BLK-L", price: "499.00", size: "l", color: "black" },
      { sku: "CCN-WHT-M", price: "499.00", size: "m", color: "white" },
    ],
  },
  {
    title: "Oversized Graphic Tee",
    slug: "oversized-graphic-tee",
    brand: "ECOM",
    description: "Relaxed fit graphic tee with premium print.",
    basePrice: "699.00",
    compareAtPrice: "999.00",
    categorySlugs: ["men-t-shirts"],
    collectionSlugs: ["graphic-tees", "new-arrivals"],
    imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800",
    variants: [
      { sku: "OGT-NVY-L", price: "699.00", size: "l", color: "navy" },
      { sku: "OGT-RED-M", price: "699.00", size: "m", color: "red" },
    ],
  },
  {
    title: "Women's Basic V-Neck Tee",
    slug: "womens-basic-vneck-tee",
    brand: "ECOM",
    description: "Lightweight v-neck tee with a flattering fit.",
    basePrice: "449.00",
    compareAtPrice: "699.00",
    categorySlugs: ["women-t-shirts"],
    collectionSlugs: ["best-sellers"],
    imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800",
    variants: [
      { sku: "WBV-WHT-S", price: "449.00", size: "s", color: "white" },
      { sku: "WBV-OLV-M", price: "449.00", size: "m", color: "olive" },
    ],
  },
];

function slugifyValue(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}

async function seedAttributes() {
  const valueMap = new Map<string, string>();

  for (const [attrIndex, attr] of ATTRIBUTES.entries()) {
    const definition = await prisma.attributeDefinition.upsert({
      where: { key: attr.key },
      update: { name: attr.name, sortOrder: attrIndex },
      create: { key: attr.key, name: attr.name, sortOrder: attrIndex },
    });

    for (const [valIndex, val] of attr.values.entries()) {
      const slug = slugifyValue(val);
      const value = await prisma.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: definition.id, slug } },
        update: { value: val, sortOrder: valIndex },
        create: {
          attributeId: definition.id,
          value: val,
          slug,
          sortOrder: valIndex,
        },
      });
      valueMap.set(`${attr.key}:${slug}`, value.id);
    }
  }

  return valueMap;
}

async function seedCategory(data: (typeof CATEGORIES)[0], parentId?: string) {
  const category = await prisma.category.upsert({
    where: { slug: data.slug },
    update: { name: data.name, sortOrder: data.sortOrder, parentId },
    create: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder,
      parentId,
    },
  });

  await prisma.categoryClosure.upsert({
    where: { ancestorId_descendantId: { ancestorId: category.id, descendantId: category.id } },
    update: {},
    create: { ancestorId: category.id, descendantId: category.id, depth: 0 },
  });

  if (parentId) {
    const parentClosures = await prisma.categoryClosure.findMany({
      where: { descendantId: parentId },
    });
    for (const pc of parentClosures) {
      await prisma.categoryClosure.upsert({
        where: {
          ancestorId_descendantId: { ancestorId: pc.ancestorId, descendantId: category.id },
        },
        update: {},
        create: {
          ancestorId: pc.ancestorId,
          descendantId: category.id,
          depth: pc.depth + 1,
        },
      });
    }
  }

  return category;
}

async function seedCategories() {
  const slugToId = new Map<string, string>();

  for (const cat of CATEGORIES.filter((c) => !("parentSlug" in c) || !c.parentSlug)) {
    const created = await seedCategory(cat);
    slugToId.set(cat.slug, created.id);
  }

  for (const cat of CATEGORIES.filter((c) => "parentSlug" in c && c.parentSlug)) {
    const parentId = slugToId.get((cat as { parentSlug: string }).parentSlug);
    const created = await seedCategory(cat, parentId);
    slugToId.set(cat.slug, created.id);
  }

  return slugToId;
}

async function seedCollections() {
  const slugToId = new Map<string, string>();
  for (const col of COLLECTIONS) {
    const collection = await prisma.collection.upsert({
      where: { slug: col.slug },
      update: { name: col.name, description: col.description },
      create: col,
    });
    slugToId.set(col.slug, collection.id);
  }
  return slugToId;
}

async function seedProducts(
  categoryIds: Map<string, string>,
  collectionIds: Map<string, string>,
  valueMap: Map<string, string>,
) {
  for (const product of SAMPLE_PRODUCTS) {
    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        title: product.title,
        brand: product.brand,
        description: product.description,
        basePrice: product.basePrice,
        compareAtPrice: product.compareAtPrice,
        status: "published",
        publishedAt: new Date(),
      },
      create: {
        title: product.title,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        basePrice: product.basePrice,
        compareAtPrice: product.compareAtPrice,
        status: "published",
        publishedAt: new Date(),
        seo: { create: { metaTitle: product.title } },
      },
    });

    await prisma.productCategory.deleteMany({ where: { productId: created.id } });
    for (const catSlug of product.categorySlugs) {
      const categoryId = categoryIds.get(catSlug);
      if (categoryId) {
        await prisma.productCategory.create({
          data: { productId: created.id, categoryId },
        });
      }
    }

    await prisma.productCollection.deleteMany({ where: { productId: created.id } });
    for (const colSlug of product.collectionSlugs) {
      const collectionId = collectionIds.get(colSlug);
      if (collectionId) {
        await prisma.productCollection.create({
          data: { productId: created.id, collectionId },
        });
      }
    }

    const existingMedia = await prisma.productMedia.count({ where: { productId: created.id } });
    if (existingMedia === 0) {
      await prisma.productMedia.create({
        data: {
          productId: created.id,
          url: product.imageUrl,
          altText: product.title,
          sortOrder: 0,
        },
      });
    }

    for (const variant of product.variants) {
      const sizeValueId = valueMap.get(`size:${variant.size}`);
      const colorValueId = valueMap.get(`color:${variant.color}`);
      if (!sizeValueId || !colorValueId) continue;

      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: { price: variant.price },
        create: {
          productId: created.id,
          sku: variant.sku,
          price: variant.price,
          options: {
            create: [
              { attributeValueId: sizeValueId },
              { attributeValueId: colorValueId },
            ],
          },
        },
      });
    }
  }
}

async function seedStorefront() {
  await prisma.announcementBar.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      message: "Free shipping on orders above ₹999 · Official brand partner",
      linkUrl: "/collections/new-arrivals",
      linkLabel: "Shop now",
      isActive: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      message: "Free shipping on orders above ₹999 · Official brand partner",
      linkUrl: "/collections/new-arrivals",
      linkLabel: "Shop now",
      sortOrder: 0,
    },
  });

  const navItems = [
    { label: "Men", href: "/men", location: "header" as const, sortOrder: 1 },
    { label: "Women", href: "/women", location: "header" as const, sortOrder: 2 },
    { label: "New Arrivals", href: "/collections/new-arrivals", location: "header" as const, sortOrder: 3 },
    { label: "Best Sellers", href: "/collections/best-sellers", location: "header" as const, sortOrder: 4 },
    { label: "T-Shirts", href: "/categories/men-t-shirts", location: "footer_shop" as const, sortOrder: 1 },
    { label: "Graphic Tees", href: "/collections/graphic-tees", location: "footer_shop" as const, sortOrder: 2 },
    { label: "Contact Us", href: "/contact", location: "footer_support" as const, sortOrder: 1 },
    { label: "FAQs", href: "/faqs", location: "footer_support" as const, sortOrder: 2 },
    { label: "Privacy Policy", href: "/privacy", location: "footer_legal" as const, sortOrder: 1 },
    { label: "Terms of Service", href: "/terms", location: "footer_legal" as const, sortOrder: 2 },
  ];

  for (const item of navItems) {
    await prisma.navigationItem.upsert({
      where: { id: `nav-${item.href.replace(/\//g, "-")}` },
      update: { label: item.label, href: item.href, location: item.location, sortOrder: item.sortOrder },
      create: { id: `nav-${item.href.replace(/\//g, "-")}`, ...item },
    });
  }

  const homepageBlocks = [
    {
      key: "hero",
      type: "hero",
      sortOrder: 1,
      content: {
        headline: "Wear Your Vibe",
        subheadline: "Premium tees for everyday style. Free shipping on orders above ₹999.",
        ctaLabel: "Shop New Arrivals",
        ctaHref: "/collections/new-arrivals",
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200",
        badge: "New Season Drop",
      },
    },
    {
      key: "social-proof",
      type: "social-proof",
      sortOrder: 2,
      content: {
        items: [
          { label: "Happy Customers", value: "2L+" },
          { label: "Products Sold", value: "10L+" },
          { label: "Styles", value: "500+" },
        ],
      },
    },
    {
      key: "shop-by-gender",
      type: "shop-by-gender",
      sortOrder: 3,
      title: "Shop For",
      content: {
        title: "Shop For",
        items: [
          { label: "Men", href: "/men", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600" },
          { label: "Women", href: "/women", imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600" },
        ],
      },
    },
    {
      key: "featured-collections",
      type: "collection-rail",
      sortOrder: 4,
      title: "Featured Collections",
      content: { title: "Featured Collections", collectionSlugs: ["new-arrivals", "best-sellers", "graphic-tees"] },
    },
    {
      key: "new-arrivals",
      type: "product-rail",
      sortOrder: 5,
      title: "New Arrivals",
      content: { title: "New Arrivals", collectionSlug: "new-arrivals", limit: 4 },
    },
    {
      key: "best-sellers",
      type: "product-rail",
      sortOrder: 6,
      title: "Best Sellers",
      content: { title: "Best Sellers", collectionSlug: "best-sellers", limit: 4 },
    },
    {
      key: "trust-badges",
      type: "trust-badges",
      sortOrder: 7,
      content: {
        items: [
          { label: "Free Shipping", description: "On orders above ₹999" },
          { label: "Easy Returns", description: "15-day hassle-free returns" },
          { label: "Secure Payments", description: "100% secure checkout" },
        ],
      },
    },
    {
      key: "newsletter",
      type: "newsletter",
      sortOrder: 8,
      content: {
        title: "Stay in the loop",
        description: "Get exclusive drops, offers, and style tips in your inbox.",
        placeholder: "Enter your email",
        ctaLabel: "Subscribe",
      },
    },
  ];

  for (const block of homepageBlocks) {
    await prisma.homepageBlock.upsert({
      where: { key: block.key },
      update: { type: block.type, title: block.title ?? null, content: block.content, sortOrder: block.sortOrder },
      create: block,
    });
  }

  const trendingTerms = ["graphic tees", "oversized", "black t-shirt", "v-neck", "new arrivals"];
  for (const [i, term] of trendingTerms.entries()) {
    await prisma.trendingSearch.upsert({
      where: { term },
      update: { sortOrder: i, isActive: true },
      create: { term, sortOrder: i },
    });
  }
}

async function seedReviews() {
  const products = await prisma.product.findMany({
    where: { status: "published" },
    select: { id: true, slug: true },
  });

  const sampleReviews = [
    { rating: 5, title: "Great quality", body: "Soft fabric and true to size. Will buy again.", verified: true },
    { rating: 4, title: "Good value", body: "Nice fit, colour matches the photos.", verified: true },
    { rating: 5, title: "Perfect everyday tee", body: "Comfortable for daily wear.", verified: false },
    { rating: 3, title: "Decent", body: "Good but runs slightly large.", verified: false },
  ];

  for (const product of products) {
    for (const [i, review] of sampleReviews.entries()) {
      await prisma.productReview.upsert({
        where: { id: `review-${product.slug}-${i}` },
        update: {
          rating: review.rating,
          title: review.title,
          body: review.body,
          isVerifiedPurchase: review.verified,
          status: "published",
        },
        create: {
          id: `review-${product.slug}-${i}`,
          productId: product.id,
          rating: review.rating,
          title: review.title,
          body: review.body,
          isVerifiedPurchase: review.verified,
          status: "published",
        },
      });
    }
  }
}

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });

    for (const permissionKey of role.permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permissionKey },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: createdRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: createdRole.id, permissionId: permission.id },
      });
    }
  }

  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { isEnabled: flag.isEnabled, description: flag.description },
      create: flag,
    });
  }

  const demoUsers = [
    { email: "admin@ecom.local", displayName: "Development Admin", role: "admin" },
    { email: "catalog@ecom.local", displayName: "Catalog Manager", role: "catalog_manager" },
    { email: "customer@ecom.local", displayName: "Demo Customer", role: "customer" },
  ] as const;

  for (const demo of demoUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: demo.role } });
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { displayName: demo.displayName, status: "active" },
      create: { email: demo.email, displayName: demo.displayName, status: "active" },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  const valueMap = await seedAttributes();
  const categoryIds = await seedCategories();
  const collectionIds = await seedCollections();
  await seedProducts(categoryIds, collectionIds, valueMap);
  await seedStorefront();
  await seedReviews();

  // eslint-disable-next-line no-console
  console.log("Seed complete: roles, permissions, catalog, storefront CMS, and sample products are ready.");
  // eslint-disable-next-line no-console
  console.log("\nDemo accounts (development OTP: 123456):");
  // eslint-disable-next-line no-console
  console.log("  admin@ecom.local     — Admin panel (http://localhost:3001/login)");
  // eslint-disable-next-line no-console
  console.log("  catalog@ecom.local   — Catalog manager (admin panel)");
  // eslint-disable-next-line no-console
  console.log("  customer@ecom.local  — Storefront customer (http://localhost:3000/account)");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
