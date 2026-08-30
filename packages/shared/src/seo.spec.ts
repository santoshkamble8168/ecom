import {
  absoluteUrl,
  buildRobotsTxt,
  cacheControlForRequest,
  jsonLdBreadcrumb,
  jsonLdFaq,
  jsonLdProduct,
  jsonLdWebSite,
} from "./seo";

describe("seo helpers", () => {
  it("builds absolute URLs without double slashes", () => {
    expect(absoluteUrl("http://localhost:3000/", "/men")).toBe("http://localhost:3000/men");
  });

  it("disallows private storefront paths in robots.txt", () => {
    const txt = buildRobotsTxt("http://localhost:3000");
    expect(txt).toContain("Disallow: /checkout");
    expect(txt).toContain("Sitemap: http://localhost:3000/sitemap.xml");
  });

  it("never shared-caches cart or auth responses", () => {
    expect(cacheControlForRequest("GET", "/api/v1/cart")).toContain("private");
    expect(cacheControlForRequest("POST", "/api/v1/products")).toContain("no-store");
  });

  it("allows short shared cache on public catalog GETs", () => {
    expect(cacheControlForRequest("GET", "/api/v1/products/classic-tee")).toContain("s-maxage=60");
  });

  it("emits Product, FAQ, breadcrumb, and SearchAction JSON-LD", () => {
    const product = jsonLdProduct({
      name: "Classic Tee",
      url: "http://localhost:3000/products/classic-tee",
      price: "799.00",
      inStock: true,
      reviewCount: 2,
      ratingValue: 4.5,
    });
    expect(product["@type"]).toBe("Product");
    expect(jsonLdFaq([{ question: "Q", answer: "A" }])["@type"]).toBe("FAQPage");
    expect(jsonLdBreadcrumb([{ name: "Home", url: "http://localhost:3000/" }])["@type"]).toBe("BreadcrumbList");
    expect(JSON.stringify(jsonLdWebSite("http://localhost:3000"))).toContain("SearchAction");
  });
});
