import { PrismaClient } from "@prisma/client";

import { seedAdminDashboard } from "./seeds/admin-dashboard.seed";
import { seedNotifications } from "./seeds/notifications.seed";
import { seedRecommendations } from "./seeds/recommendations.seed";
import { seedBlog } from "./seeds/blog.seed";
import { seedCms } from "./seeds/cms.seed";
import { seedInventory } from "./seeds/inventory.seed";
import { seedPricing } from "./seeds/pricing.seed";
import { seedPromotions } from "./seeds/promotions.seed";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "catalog:read", description: "View catalog data" },
  { key: "catalog:write", description: "Manage catalog data" },
  { key: "order:read", description: "View orders" },
  { key: "order:write", description: "Manage orders" },
  { key: "admin:access", description: "Access the admin dashboard" },
  { key: "user:read", description: "View users and roles" },
  { key: "user:write", description: "Manage users and role assignments" },
  { key: "inventory:read", description: "View warehouses, stock, and purchase orders" },
  { key: "inventory:write", description: "Manage warehouses, stock, and purchase orders" },
  { key: "pricing:read", description: "View price lists, prices, and tax rules" },
  { key: "pricing:write", description: "Manage price lists, prices, and tax rules" },
  { key: "promotion:read", description: "View coupons and campaigns" },
  { key: "promotion:write", description: "Manage coupons and campaigns" },
  { key: "dashboard:read", description: "View the admin operations dashboard" },
  { key: "customer:read", description: "View customer profiles and history" },
  { key: "customer:write", description: "Manage customer status, notes, and preferences" },
  { key: "audit:read", description: "View audit logs" },
  { key: "audit:export", description: "Export audit logs" },
  { key: "settings:read", description: "View platform settings" },
  { key: "settings:write", description: "Update platform settings" },
  { key: "feature_flag:read", description: "View feature flags" },
  { key: "feature_flag:write", description: "Toggle feature flags" },
  { key: "report:read", description: "View report catalog" },
  { key: "report:export", description: "Queue report export jobs" },
  { key: "notification:read", description: "View notification templates and delivery logs" },
  { key: "notification:write", description: "Manage templates, preview, and test-send" },
  { key: "analytics:read", description: "View analytics KPIs, funnels, search, and product reports" },
  { key: "recommendation:read", description: "View recommendation slot configuration" },
  { key: "recommendation:write", description: "Update recommendation slot rules and fallbacks" },
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
    permissionKeys: ["catalog:read", "catalog:write", "admin:access", "dashboard:read"],
  },
  {
    name: "customer_support",
    description: "Handles customer support and orders",
    permissionKeys: [
      "order:read",
      "order:write",
      "user:read",
      "admin:access",
      "dashboard:read",
      "customer:read",
      "customer:write",
      "notification:read",
    ],
  },
  {
    name: "marketing_manager",
    description: "Manages campaigns and storefront content (CMS/marketing endpoints require full admin:access — no dedicated CMS permission yet)",
    permissionKeys: [
      "catalog:read",
      "promotion:read",
      "promotion:write",
      "admin:access",
      "dashboard:read",
      "report:read",
      "notification:read",
      "notification:write",
      "analytics:read",
      "recommendation:read",
      "recommendation:write",
    ],
  },
  {
    name: "inventory_manager",
    description: "Manages warehouses, stock, and pricing",
    permissionKeys: [
      "inventory:read",
      "inventory:write",
      "pricing:read",
      "pricing:write",
      "admin:access",
      "dashboard:read",
      "report:read",
    ],
  },
  {
    name: "analyst",
    description: "Reads dashboards, reports, and audit trails",
    permissionKeys: [
      "admin:access",
      "dashboard:read",
      "report:read",
      "report:export",
      "audit:read",
      "customer:read",
      "analytics:read",
    ],
  },
  {
    name: "finance",
    description: "Reads sales, tax, and refund reports",
    permissionKeys: [
      "admin:access",
      "dashboard:read",
      "report:read",
      "report:export",
      "order:read",
      "analytics:read",
    ],
  },
];

const FEATURE_FLAGS = [
  { key: "search.meilisearch", isEnabled: false, description: "Enable Meilisearch-backed search", environment: "all", rolloutPercent: 100 },
  { key: "payments.razorpay", isEnabled: true, description: "Enable Razorpay checkout (mock mode locally)", environment: "all", rolloutPercent: 100 },
  { key: "checkout.new_flow", isEnabled: false, description: "Enable the redesigned checkout flow", environment: "development", rolloutPercent: 0 },
  { key: "recommendations.ai", isEnabled: false, description: "Enable AI product recommendations (no provider wired; rules still apply)", environment: "all", rolloutPercent: 0 },
  { key: "search.semantic", isEnabled: false, description: "Request semantic search mode (falls back to keyword until a vector provider exists)", environment: "all", rolloutPercent: 0 },
  { key: "personalization.profiles", isEnabled: true, description: "Aggregate logged-in recently-viewed affinities into personalization profiles", environment: "all", rolloutPercent: 100 },
  { key: "wallet.enabled", isEnabled: false, description: "Enable wallet tender", environment: "all", rolloutPercent: 0 },
  { key: "referral.program", isEnabled: false, description: "Enable the referral program", environment: "all", rolloutPercent: 0 },
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
    collectionSlugs: ["graphic-tees", "new-arrivals", "best-sellers"],
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
    { label: "T-Shirts", href: "/t-shirts", location: "header" as const, sortOrder: 1 },
    { label: "New Arrivals", href: "/collections/new-arrivals", location: "header" as const, sortOrder: 2 },
    { label: "Best Sellers", href: "/collections/best-sellers", location: "header" as const, sortOrder: 3 },
    { label: "About", href: "/about", location: "header" as const, sortOrder: 4 },
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

  await prisma.navigationItem.deleteMany({
    where: { location: "header", href: { in: ["/men", "/women"] } },
  });

  const homepageBlocks = [
    {
      key: "hero",
      type: "hero",
      sortOrder: 1,
      content: {
        headline: "T-Shirts Made for Every Day.",
        subheadline: "Clean designs. Quality cotton. Comfortable fits — from classic crew to oversized graphics.",
        ctaLabel: "Shop T-Shirts",
        ctaHref: "/t-shirts",
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200",
      },
    },
    {
      key: "social-proof",
      type: "social-proof",
      sortOrder: 2,
      content: {
        items: [
          { label: "Current styles", value: "3" },
          { label: "Size run", value: "S–L" },
          { label: "Return window", value: "7 days" },
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
          { label: "T-Shirts", href: "/t-shirts", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600" },
          { label: "New Arrivals", href: "/collections/new-arrivals", imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600" },
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
          { label: "Easy Returns", description: "7-day returns for unused items" },
          { label: "Secure Payments", description: "UPI, cards, and net banking" },
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

async function seedCoupons() {
  const coupons = [
    { code: "WELCOME10", type: "percent" as const, value: "10", minCartValue: null },
    { code: "FLAT100", type: "fixed" as const, value: "100", minCartValue: "500" },
    { code: "FREESHIP", type: "free_shipping" as const, value: "0", minCartValue: null },
    {
      code: "EXPIRED",
      type: "percent" as const,
      value: "20",
      minCartValue: null,
      expiresAt: new Date("2020-01-01"),
      isActive: true,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        type: coupon.type,
        value: coupon.value,
        minCartValue: coupon.minCartValue,
        expiresAt: coupon.expiresAt ?? null,
        isActive: coupon.isActive ?? true,
      },
      create: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minCartValue: coupon.minCartValue,
        expiresAt: coupon.expiresAt ?? null,
        isActive: coupon.isActive ?? true,
      },
    });
  }
}

async function seedCheckoutConfig() {
  const standard = await prisma.shippingMethod.upsert({
    where: { code: "standard" },
    update: {},
    create: {
      code: "standard",
      label: "Standard Delivery",
      baseFee: "49",
      estimatedDaysMin: 4,
      estimatedDaysMax: 7,
      sortOrder: 0,
    },
  });

  const express = await prisma.shippingMethod.upsert({
    where: { code: "express" },
    update: {},
    create: {
      code: "express",
      label: "Express Delivery",
      baseFee: "99",
      estimatedDaysMin: 2,
      estimatedDaysMax: 4,
      sortOrder: 1,
    },
  });

  const metroPrefixes = ["11", "12", "40", "41", "50", "56", "60", "70"];

  await prisma.shippingZone.deleteMany({
    where: { shippingMethodId: { in: [standard.id, express.id] } },
  });

  await prisma.shippingZone.create({
    data: {
      name: "All India — Standard",
      pincodePrefixes: [...metroPrefixes, "30", "80", "90", "95"],
      shippingMethodId: standard.id,
    },
  });

  await prisma.shippingZone.create({
    data: {
      name: "Metro — Express",
      pincodePrefixes: metroPrefixes,
      shippingMethodId: express.id,
    },
  });

  await prisma.taxRule.upsert({
    where: { id: "default-gst-apparel" },
    update: { rate: "0.0500", isActive: true },
    create: {
      id: "default-gst-apparel",
      name: "GST Apparel (5%)",
      rate: "0.0500",
      appliesTo: "all",
      priority: 0,
    },
  });
}

const COURIERS = [
  { name: "Delhivery", code: "delhivery", trackingUrlTemplate: "https://www.delhivery.com/track/package/{trackingNumber}" },
  { name: "Bluedart", code: "bluedart", trackingUrlTemplate: "https://www.bluedart.com/tracking?trackingNumber={trackingNumber}" },
  { name: "Ekart", code: "ekart", trackingUrlTemplate: "https://ekartlogistics.com/track/{trackingNumber}" },
];

const RETURN_REASONS = [
  { code: "size_issue", label: "Size doesn't fit", sortOrder: 0 },
  { code: "quality_issue", label: "Product quality not as expected", sortOrder: 1 },
  { code: "wrong_item", label: "Received wrong item", sortOrder: 2 },
  { code: "damaged", label: "Item arrived damaged", sortOrder: 3 },
  { code: "not_as_described", label: "Not as described / pictured", sortOrder: 4 },
  { code: "changed_mind", label: "Changed my mind", sortOrder: 5 },
  { code: "other", label: "Other", sortOrder: 6 },
];

const EXCHANGE_REASONS = [
  { code: "size_too_small", label: "Size too small", sortOrder: 0 },
  { code: "size_too_large", label: "Size too large", sortOrder: 1 },
  { code: "wrong_color", label: "Wrong color / prefer different color", sortOrder: 2 },
  { code: "defective", label: "Defective — need replacement", sortOrder: 3 },
  { code: "other", label: "Other", sortOrder: 4 },
];

async function seedOrdersFulfillment() {
  for (const courier of COURIERS) {
    await prisma.courier.upsert({
      where: { code: courier.code },
      update: { name: courier.name, trackingUrlTemplate: courier.trackingUrlTemplate },
      create: courier,
    });
  }

  for (const reason of RETURN_REASONS) {
    await prisma.returnReason.upsert({
      where: { code: reason.code },
      update: { label: reason.label, sortOrder: reason.sortOrder },
      create: reason,
    });
  }

  for (const reason of EXCHANGE_REASONS) {
    await prisma.exchangeReason.upsert({
      where: { code: reason.code },
      update: { label: reason.label, sortOrder: reason.sortOrder },
      create: reason,
    });
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
      update: {
        isEnabled: flag.isEnabled,
        description: flag.description,
        environment: flag.environment,
        rolloutPercent: flag.rolloutPercent,
      },
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
  await seedCms(prisma);
  await seedStorefront();
  await seedReviews();
  await seedCoupons();
  await seedPromotions(prisma);
  await seedCheckoutConfig();
  await seedOrdersFulfillment();
  await seedInventory(prisma);
  await seedPricing(prisma);
  await seedBlog(prisma);
  await seedAdminDashboard(prisma);
  await seedNotifications(prisma);
  await seedRecommendations(prisma);

  // eslint-disable-next-line no-console
  console.log("Seed complete: roles, permissions, catalog, storefront CMS, checkout config, and sample products are ready.");
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
