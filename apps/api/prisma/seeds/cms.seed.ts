import { PrismaClient } from "@prisma/client";

/**
 * Sprint 11 CMS seed data — a homepage, two static pages, homepage hero
 * banners, and the main-nav/footer menus. Run after catalog/collections are
 * seeded (the homepage references a real `Collection.slug`).
 */
export async function seedCms(prisma: PrismaClient): Promise<void> {
  await prisma.banner.upsert({
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

  const now = new Date();

  const homepageSections = [
    {
      kind: "hero",
      headline: "T-Shirts Made for Every Day.",
      subheadline: "Clean designs. Quality cotton. Comfortable fits — from classic crew to oversized graphics.",
      ctaLabel: "Shop T-Shirts",
      ctaHref: "/t-shirts",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600",
      imageAlt: "Classic cotton crew-neck t-shirt",
    },
    { kind: "collection_grid", title: "Best Sellers", collectionSlug: "best-sellers", limit: 4 },
    {
      kind: "feature_grid",
      title: "Built Around the Details",
      items: [
        { title: "Soft cotton", description: "Our core tees are cut from cotton chosen for everyday wear, not a fashion photoshoot." },
        { title: "Everyday and oversized", description: "Classic crew for a regular fit, plus an oversized graphic tee when you want a relaxed silhouette." },
        { title: "Sizes that map to real wear", description: "Shop S–L on current styles. Check the product page for the exact size run." },
        { title: "7-day returns", description: "Unused items can be returned within 7 days of delivery. See our returns policy for details." },
      ],
    },
    {
      kind: "fit_guide",
      title: "Find Your Fit",
      imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200",
      html:
        "<p>Fit is the usual reason people hesitate on a tee. Use this as a starting point, then confirm size on the product page.</p><ul><li><strong>Classic Crew Neck</strong> — regular everyday fit. Start with your usual size.</li><li><strong>Oversized Graphic Tee</strong> — relaxed silhouette. Stay true to size for the intended look, or size down for less volume.</li><li><strong>Women’s V-Neck</strong> — lighter fabric with a closer cut.</li></ul><p>We publish height and size-worn notes as we add model photography. Care: follow the label in the garment.</p>",
    },
    {
      kind: "story",
      title: "More Than Just a T-Shirt.",
      html: "<p>We believe everyday clothing should feel good, fit well, and last. That’s why we keep the range focused on tees — from fabric and fit to the finishing you actually notice after a dozen washes.</p>",
    },
    {
      kind: "trust_row",
      title: "What to expect",
      items: [
        { title: "Fast shipping", description: "Standard delivery 4–7 business days. Express 2–4 where available. Free shipping on orders above ₹999." },
        { title: "Easy returns", description: "Request a return within 7 days of delivery for unused items in original condition." },
        { title: "Secure payments", description: "Checkout with UPI, cards, and net banking." },
        { title: "Customer support", description: "Questions about an order? Use the contact form — we reply within one business day." },
      ],
    },
    {
      kind: "cta_banner",
      headline: "Find Your New Favorite Tee.",
      subheadline: "Explore the collection — classic, oversized, and everyday fits.",
      ctaLabel: "Shop All T-Shirts",
      ctaHref: "/t-shirts",
    },
  ];

  await prisma.page.upsert({
    where: { slug: "home" },
    update: {
      title: "Homepage",
      status: "published",
      publishedAt: now,
      seoTitle: "Ecom | T-Shirts Made for Every Day",
      seoDescription:
        "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
      seoCanonicalUrl: "/",
      fields: { sections: homepageSections },
    },
    create: {
      type: "homepage",
      slug: "home",
      title: "Homepage",
      status: "published",
      publishedAt: now,
      seoTitle: "Ecom | T-Shirts Made for Every Day",
      seoDescription:
        "Clean cotton tees for everyday wear. Classic crew, oversized graphics, and easy returns. Free shipping above ₹999.",
      seoCanonicalUrl: "/",
      fields: { sections: homepageSections },
    },
  });

  const privacyHtml =
    "<h2>Privacy Policy</h2><p>Last updated: 20 September 2026</p><p>We collect only the information needed to process your orders, prevent fraud, and improve your shopping experience. We never sell your personal data to third parties.</p><h2>Cookies</h2><p>Essential cookies keep your cart and checkout working. Optional analytics cookies run only after you accept them on the cookie banner.</p><p>Contact <a href=\"/contact\">support</a> for access or deletion requests.</p>";

  await prisma.page.upsert({
    where: { slug: "privacy-policy" },
    update: {
      title: "Privacy Policy",
      status: "published",
      publishedAt: now,
      seoTitle: "Privacy Policy",
      seoDescription: "How Ecom collects, uses, and protects personal data for orders, cookies, and analytics.",
      seoCanonicalUrl: "/privacy",
      fields: { bodyHtml: privacyHtml },
    },
    create: {
      type: "policy",
      slug: "privacy-policy",
      title: "Privacy Policy",
      status: "published",
      publishedAt: now,
      seoTitle: "Privacy Policy",
      seoDescription: "How Ecom collects, uses, and protects personal data for orders, cookies, and analytics.",
      seoCanonicalUrl: "/privacy",
      fields: { bodyHtml: privacyHtml },
    },
  });

  const termsHtml =
    "<h2>Terms and Conditions</h2><p>Last updated: 20 September 2026</p><p>By placing an order you agree to these terms of sale. Prices are in INR and include applicable GST unless stated otherwise.</p><p>Returns are accepted within 7 days of delivery for unused items. See the FAQ for shipping estimates and exchange rules.</p>";

  await prisma.page.upsert({
    where: { slug: "terms" },
    update: {
      title: "Terms and Conditions",
      status: "published",
      publishedAt: now,
      seoTitle: "Terms and Conditions",
      seoDescription: "Terms of sale, returns, and acceptable use for shopping on Ecom.",
      seoCanonicalUrl: "/terms",
      fields: { bodyHtml: termsHtml },
    },
    create: {
      type: "policy",
      slug: "terms",
      title: "Terms and Conditions",
      status: "published",
      publishedAt: now,
      seoTitle: "Terms and Conditions",
      seoDescription: "Terms of sale, returns, and acceptable use for shopping on Ecom.",
      seoCanonicalUrl: "/terms",
      fields: { bodyHtml: termsHtml },
    },
  });

  const aboutHtml =
    "<p>We believe everyday clothing should feel good, fit well, and last. That’s why we focus on cotton tees — classic crew, oversized graphics, and simple finishing you notice after a dozen washes.</p><p><a href=\"/t-shirts\">Shop T-Shirts</a></p>";
  await prisma.page.upsert({
    where: { slug: "about" },
    update: {
      title: "About Ecom",
      status: "published",
      publishedAt: now,
      seoTitle: "About Ecom",
      seoDescription: "Ecom designs premium tees with secure checkout, fast shipping, and easy returns.",
      seoCanonicalUrl: "/about",
      fields: { bodyHtml: aboutHtml },
    },
    create: {
      type: "policy",
      slug: "about",
      title: "About Ecom",
      status: "published",
      publishedAt: now,
      seoTitle: "About Ecom",
      seoDescription: "Ecom designs premium tees with secure checkout, fast shipping, and easy returns.",
      seoCanonicalUrl: "/about",
      fields: { bodyHtml: aboutHtml },
    },
  });

  const contactHtml =
    "<p>We typically reply within one business day. For order tracking, use your shipment number on the <a href=\"/track\">Track order</a> page.</p>";
  await prisma.page.upsert({
    where: { slug: "contact" },
    update: {
      title: "Contact us",
      status: "published",
      publishedAt: now,
      seoTitle: "Contact Ecom",
      seoDescription: "Get in touch with Ecom support about orders, shipping, and returns.",
      seoCanonicalUrl: "/contact",
      fields: { bodyHtml: contactHtml },
    },
    create: {
      type: "policy",
      slug: "contact",
      title: "Contact us",
      status: "published",
      publishedAt: now,
      seoTitle: "Contact Ecom",
      seoDescription: "Get in touch with Ecom support about orders, shipping, and returns.",
      seoCanonicalUrl: "/contact",
      fields: { bodyHtml: contactHtml },
    },
  });

  const shippingHtml =
    "<p>Standard delivery takes 4–7 business days. Express delivery takes 2–4 business days where available. Free shipping on orders above ₹999.</p>";
  await prisma.page.upsert({
    where: { slug: "shipping" },
    update: {
      title: "Shipping Policy",
      status: "published",
      publishedAt: now,
      seoTitle: "Shipping Policy",
      seoDescription: "Delivery timelines, shipping charges, and pincode serviceability for Ecom orders.",
      seoCanonicalUrl: "/shipping",
      fields: { bodyHtml: shippingHtml },
    },
    create: {
      type: "policy",
      slug: "shipping",
      title: "Shipping Policy",
      status: "published",
      publishedAt: now,
      seoTitle: "Shipping Policy",
      seoDescription: "Delivery timelines, shipping charges, and pincode serviceability for Ecom orders.",
      seoCanonicalUrl: "/shipping",
      fields: { bodyHtml: shippingHtml },
    },
  });

  const returnsHtml =
    "<p>Request a return within 7 days of delivery for unused items in original condition. Exchanges are subject to stock availability.</p>";
  await prisma.page.upsert({
    where: { slug: "returns" },
    update: {
      title: "Returns and Exchanges",
      status: "published",
      publishedAt: now,
      seoTitle: "Returns and Exchanges",
      seoDescription: "How to return or exchange an Ecom order within 7 days of delivery.",
      seoCanonicalUrl: "/returns",
      fields: { bodyHtml: returnsHtml },
    },
    create: {
      type: "policy",
      slug: "returns",
      title: "Returns and Exchanges",
      status: "published",
      publishedAt: now,
      seoTitle: "Returns and Exchanges",
      seoDescription: "How to return or exchange an Ecom order within 7 days of delivery.",
      seoCanonicalUrl: "/returns",
      fields: { bodyHtml: returnsHtml },
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
      seoTitle: "Frequently Asked Questions",
      seoDescription: "Answers about delivery, returns, exchanges, and tracking Ecom orders.",
      seoCanonicalUrl: "/pages/faq",
      fields: { items: faqItems },
    },
    create: {
      type: "faq",
      slug: "faq",
      title: "Frequently Asked Questions",
      status: "published",
      publishedAt: now,
      seoTitle: "Frequently Asked Questions",
      seoDescription: "Answers about delivery, returns, exchanges, and tracking Ecom orders.",
      seoCanonicalUrl: "/pages/faq",
      fields: { items: faqItems },
    },
  });

  const mainNav = await prisma.menu.upsert({
    where: { code: "main-nav" },
    update: { name: "Main Navigation" },
    create: { code: "main-nav", name: "Main Navigation" },
  });

  const mainNavItems = [
    { id: "cms-menu-item-men", label: "T-Shirts", url: "/t-shirts", sortOrder: 0, isActive: true },
    { id: "cms-menu-item-women", label: "Women", url: "/women", sortOrder: 1, isActive: false },
    { id: "cms-menu-item-new-arrivals", label: "New Arrivals", url: "/collections/new-arrivals", sortOrder: 2, isActive: true },
    { id: "cms-menu-item-sale", label: "Best Sellers", url: "/collections/best-sellers", sortOrder: 3, isActive: true },
    { id: "cms-menu-item-about", label: "About", url: "/about", sortOrder: 4, isActive: true },
  ];

  for (const item of mainNavItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { label: item.label, url: item.url, sortOrder: item.sortOrder, menuId: mainNav.id, isActive: item.isActive },
      create: {
        id: item.id,
        menuId: mainNav.id,
        label: item.label,
        url: item.url,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      },
    });
  }

  const footer = await prisma.menu.upsert({
    where: { code: "footer" },
    update: { name: "Footer" },
    create: { code: "footer", name: "Footer" },
  });

  const footerItems = [
    { id: "cms-menu-item-privacy", label: "Privacy Policy", url: "/privacy", sortOrder: 0 },
    { id: "cms-menu-item-terms", label: "Terms and Conditions", url: "/terms", sortOrder: 1 },
    { id: "cms-menu-item-faq", label: "FAQ", url: "/pages/faq", sortOrder: 2 },
    { id: "cms-menu-item-contact", label: "Contact", url: "/contact", sortOrder: 3 },
    { id: "cms-menu-item-track", label: "Track Order", url: "/track", sortOrder: 4 },
    { id: "cms-menu-item-shipping", label: "Shipping", url: "/shipping", sortOrder: 5 },
    { id: "cms-menu-item-returns", label: "Returns", url: "/returns", sortOrder: 6 },
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
