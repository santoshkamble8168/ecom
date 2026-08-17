import { PrismaClient } from "@prisma/client";

/**
 * Sprint 11 CMS seed data — a homepage, two static pages, homepage hero
 * banners, and the main-nav/footer menus. Run after catalog/collections are
 * seeded (the homepage references a real `Collection.slug`).
 */
export async function seedCms(prisma: PrismaClient): Promise<void> {
  const heroBannerOne = await prisma.banner.upsert({
    where: { id: "cms-banner-hero-1" },
    update: {
      title: "New Season Drop",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600",
      linkUrl: "/collections/new-arrivals",
      altText: "Model wearing the new season collection",
      placement: "homepage_hero",
      status: "published",
      sortOrder: 0,
    },
    create: {
      id: "cms-banner-hero-1",
      title: "New Season Drop",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600",
      linkUrl: "/collections/new-arrivals",
      altText: "Model wearing the new season collection",
      placement: "homepage_hero",
      status: "published",
      sortOrder: 0,
    },
  });

  await prisma.banner.upsert({
    where: { id: "cms-banner-hero-2" },
    update: {
      title: "Free Shipping Over ₹999",
      imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1600",
      linkUrl: "/collections/best-sellers",
      altText: "Free shipping promotional banner",
      placement: "homepage_hero",
      status: "published",
      sortOrder: 1,
    },
    create: {
      id: "cms-banner-hero-2",
      title: "Free Shipping Over ₹999",
      imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1600",
      linkUrl: "/collections/best-sellers",
      altText: "Free shipping promotional banner",
      placement: "homepage_hero",
      status: "published",
      sortOrder: 1,
    },
  });

  const firstCollection = await prisma.collection.findFirst({ orderBy: { name: "asc" } });
  const collectionSlug = firstCollection?.slug ?? "new-arrivals";

  const now = new Date();

  await prisma.page.upsert({
    where: { slug: "home" },
    update: {
      title: "Homepage",
      status: "published",
      publishedAt: now,
      fields: {
        sections: [
          { kind: "hero_banner", bannerId: heroBannerOne.id },
          { kind: "collection_grid", title: "New Arrivals", collectionSlug, limit: 8 },
          { kind: "rich_text", title: "Why shop with us", html: "<p>Fast shipping, easy returns, secure payments.</p>" },
        ],
      },
    },
    create: {
      type: "homepage",
      slug: "home",
      title: "Homepage",
      status: "published",
      publishedAt: now,
      fields: {
        sections: [
          { kind: "hero_banner", bannerId: heroBannerOne.id },
          { kind: "collection_grid", title: "New Arrivals", collectionSlug, limit: 8 },
          { kind: "rich_text", title: "Why shop with us", html: "<p>Fast shipping, easy returns, secure payments.</p>" },
        ],
      },
    },
  });

  await prisma.page.upsert({
    where: { slug: "privacy-policy" },
    update: {
      title: "Privacy Policy",
      status: "published",
      publishedAt: now,
      fields: {
        bodyHtml:
          "<h2>Privacy Policy</h2><p>We collect only the information needed to process your orders and improve your shopping experience. We never sell your personal data to third parties.</p>",
      },
    },
    create: {
      type: "policy",
      slug: "privacy-policy",
      title: "Privacy Policy",
      status: "published",
      publishedAt: now,
      fields: {
        bodyHtml:
          "<h2>Privacy Policy</h2><p>We collect only the information needed to process your orders and improve your shopping experience. We never sell your personal data to third parties.</p>",
      },
    },
  });

  const faqItems = [
    { question: "How long does delivery take?", answer: "Standard delivery takes 4-7 business days; express delivery takes 2-4 business days.", sortOrder: 0 },
    { question: "What is your return policy?", answer: "You can request a return within 7 days of delivery for a full refund.", sortOrder: 1 },
    { question: "Do you offer exchanges?", answer: "Yes, exchanges are available within 7 days of delivery, subject to stock availability.", sortOrder: 2 },
    { question: "How can I track my order?", answer: "Use the tracking link in your shipping confirmation email, or visit the Track Order page.", sortOrder: 3 },
  ];

  await prisma.page.upsert({
    where: { slug: "faq" },
    update: {
      title: "Frequently Asked Questions",
      status: "published",
      publishedAt: now,
      fields: { items: faqItems },
    },
    create: {
      type: "faq",
      slug: "faq",
      title: "Frequently Asked Questions",
      status: "published",
      publishedAt: now,
      fields: { items: faqItems },
    },
  });

  const mainNav = await prisma.menu.upsert({
    where: { code: "main-nav" },
    update: { name: "Main Navigation" },
    create: { code: "main-nav", name: "Main Navigation" },
  });

  const mainNavItems = [
    { id: "cms-menu-item-men", label: "Men", url: "/men", sortOrder: 0 },
    { id: "cms-menu-item-women", label: "Women", url: "/women", sortOrder: 1 },
    { id: "cms-menu-item-new-arrivals", label: "New Arrivals", url: "/collections/new-arrivals", sortOrder: 2 },
    { id: "cms-menu-item-sale", label: "Sale", url: "/collections/sale", sortOrder: 3 },
    { id: "cms-menu-item-about", label: "About", url: "/about", sortOrder: 4 },
  ];

  for (const item of mainNavItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { label: item.label, url: item.url, sortOrder: item.sortOrder, menuId: mainNav.id, isActive: true },
      create: { id: item.id, menuId: mainNav.id, label: item.label, url: item.url, sortOrder: item.sortOrder },
    });
  }

  const footer = await prisma.menu.upsert({
    where: { code: "footer" },
    update: { name: "Footer" },
    create: { code: "footer", name: "Footer" },
  });

  const footerItems = [
    { id: "cms-menu-item-privacy", label: "Privacy Policy", url: "/pages/privacy-policy", sortOrder: 0 },
    { id: "cms-menu-item-faq", label: "FAQ", url: "/pages/faq", sortOrder: 1 },
    { id: "cms-menu-item-contact", label: "Contact", url: "/contact", sortOrder: 2 },
    { id: "cms-menu-item-track", label: "Track Order", url: "/track", sortOrder: 3 },
  ];

  for (const item of footerItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { label: item.label, url: item.url, sortOrder: item.sortOrder, menuId: footer.id, isActive: true },
      create: { id: item.id, menuId: footer.id, label: item.label, url: item.url, sortOrder: item.sortOrder },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete: CMS pages, banners, and menus are ready.");
}
