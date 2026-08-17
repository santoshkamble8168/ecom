import { expect, test } from "../fixtures";
import { expectNoAccessibilityViolations } from "../utils/accessibility";

/**
 * Sprint 11 storefront blog: `/blog` and `/blog/[slug]`, backed by the 3
 * seeded posts/2 categories/3 tags in `apps/api/prisma/seeds/blog.seed.ts`.
 */
test.describe("Storefront blog", () => {
  test("renders seeded post cards on the blog index", async ({ storefrontBlog }) => {
    await storefrontBlog.goto();

    await expect(storefrontBlog.heading).toBeVisible();
    await expect(storefrontBlog.postCardLink("How to Style an Oversized Tee, 5 Ways")).toBeVisible();
    await expect(storefrontBlog.postCardLink("Our Commitment to Sustainable Cotton")).toBeVisible();
    await expect(storefrontBlog.postCardLink("Streetwear Essentials for the New Season")).toBeVisible();
  });

  test("opens a post and renders its title, content, author, and tags", async ({
    storefrontBlog,
    storefrontBlogPost,
    page,
  }) => {
    await storefrontBlog.goto();
    await storefrontBlog.postCardLink("How to Style an Oversized Tee, 5 Ways").click();

    await expect(page).toHaveURL(/\/blog\/how-to-style-an-oversized-tee$/);
    await expect(storefrontBlogPost.heading).toHaveText("How to Style an Oversized Tee, 5 Ways");
    await expect(page.getByText(/The oversized tee is a wardrobe staple/)).toBeVisible();
    await expect(page.getByText(/By Editorial Team/)).toBeVisible();
    await expect(storefrontBlogPost.tagLink("Oversized")).toBeVisible();
    await expect(storefrontBlogPost.tagLink("Streetwear")).toBeVisible();
  });

  test("filters the post list by category", async ({ storefrontBlog }) => {
    await storefrontBlog.goto();
    await storefrontBlog.categoryFilterLink("Style Guides").click();

    await expect(storefrontBlog.postCardLink("How to Style an Oversized Tee, 5 Ways")).toBeVisible();
    await expect(storefrontBlog.postCardLink("Streetwear Essentials for the New Season")).toBeVisible();
    await expect(storefrontBlog.postCardLink("Our Commitment to Sustainable Cotton")).toHaveCount(0);
  });

  test("filters the post list by tag", async ({ storefrontBlog }) => {
    await storefrontBlog.goto();
    await storefrontBlog.tagFilterLink("Sustainability").click();

    await expect(storefrontBlog.postCardLink("Our Commitment to Sustainable Cotton")).toBeVisible();
    await expect(storefrontBlog.postCardLink("How to Style an Oversized Tee, 5 Ways")).toHaveCount(0);
  });

  test("has no automatically detectable accessibility violations", async ({ storefrontBlog, page }) => {
    await storefrontBlog.goto();
    await expectNoAccessibilityViolations(page);
  });
});
