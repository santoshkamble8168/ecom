import { expect, test } from "../fixtures";

/**
 * Sprint 11 admin blog flow: lists the seeded posts, then opens one and
 * verifies the category/tag pickers and content fields
 * (`apps/api/prisma/seeds/blog.seed.ts`) render with the post's real data.
 */
test.describe("Admin blog posts", () => {
  test.beforeEach(async ({ adminLogin }) => {
    await adminLogin.loginAsAdmin();
  });

  test("lists the seeded blog posts with their categories", async ({ adminBlogList }) => {
    await adminBlogList.goto();

    await expect(adminBlogList.heading).toBeVisible();

    const post = adminBlogList.rowByTitle("How to Style an Oversized Tee, 5 Ways");
    await expect(post).toBeVisible();
    await expect(post).toContainText("Style Guides");
    await expect(post).toContainText("Published");
  });

  test("opens a post and shows populated category/tag pickers and content", async ({
    adminBlogList,
    adminBlogEditor,
    page,
  }) => {
    await adminBlogList.goto();
    await adminBlogList.editLinkForTitle("How to Style an Oversized Tee, 5 Ways").click();

    await expect(page).toHaveURL(/\/blog\/[^/]+$/);
    await expect(adminBlogEditor.heading).toBeVisible();
    await expect(adminBlogEditor.titleInput).toHaveValue("How to Style an Oversized Tee, 5 Ways");

    await expect(adminBlogEditor.categoriesLabel).toBeVisible();
    await expect(adminBlogEditor.categoryCheckbox("Style Guides")).toBeChecked();

    await expect(adminBlogEditor.tagsLabel).toBeVisible();
    await expect(adminBlogEditor.tagCheckbox("Oversized")).toBeChecked();
    await expect(adminBlogEditor.tagCheckbox("Streetwear")).toBeChecked();

    await expect(adminBlogEditor.contentInput).not.toHaveValue("");
  });
});
