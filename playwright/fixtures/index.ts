import { test as base } from "@playwright/test";

import { AdminAuditLogsPage } from "../pages/admin-audit-logs.page";
import { AdminBannersListPage } from "../pages/admin-banners-list.page";
import { AdminBlogEditorPage } from "../pages/admin-blog-editor.page";
import { AdminBlogListPage } from "../pages/admin-blog-list.page";
import { AdminCustomersPage, AdminCustomerDetailPage } from "../pages/admin-customers.page";
import { AdminDashboardPage } from "../pages/admin-dashboard.page";
import { AdminFeatureFlagsPage } from "../pages/admin-feature-flags.page";
import { AdminInventoryPage } from "../pages/admin-inventory.page";
import { AdminLoginPage } from "../pages/admin-login.page";
import { AdminPageEditorPage } from "../pages/admin-page-editor.page";
import { AdminPagesListPage } from "../pages/admin-pages-list.page";
import { AdminPricingPage, AdminTaxRulesPage } from "../pages/admin-pricing.page";
import { AdminCampaignsPage, AdminCouponDetailPage, AdminCouponsPage } from "../pages/admin-promotions.page";
import { AdminReportsPage } from "../pages/admin-reports.page";
import { AdminSettingsPage } from "../pages/admin-settings.page";
import { StorefrontBlogPostPage } from "../pages/storefront-blog-post.page";
import { StorefrontBlogPage } from "../pages/storefront-blog.page";
import { StorefrontCartPage } from "../pages/storefront-cart.page";
import { StorefrontCategoryPage } from "../pages/storefront-category.page";
import { StorefrontHomePage } from "../pages/storefront-home.page";
import { StorefrontProductPage } from "../pages/storefront-product.page";

interface Fixtures {
  storefrontHome: StorefrontHomePage;
  adminDashboard: AdminDashboardPage;
  adminLogin: AdminLoginPage;
  adminInventory: AdminInventoryPage;
  adminPricing: AdminPricingPage;
  adminTaxRules: AdminTaxRulesPage;
  adminCoupons: AdminCouponsPage;
  adminCouponDetail: AdminCouponDetailPage;
  adminCampaigns: AdminCampaignsPage;
  adminCustomers: AdminCustomersPage;
  adminCustomerDetail: AdminCustomerDetailPage;
  adminAuditLogs: AdminAuditLogsPage;
  adminFeatureFlags: AdminFeatureFlagsPage;
  adminSettings: AdminSettingsPage;
  adminReports: AdminReportsPage;
  storefrontCategory: StorefrontCategoryPage;
  storefrontProduct: StorefrontProductPage;
  storefrontCart: StorefrontCartPage;
  adminPagesList: AdminPagesListPage;
  adminPageEditor: AdminPageEditorPage;
  adminBannersList: AdminBannersListPage;
  adminBlogList: AdminBlogListPage;
  adminBlogEditor: AdminBlogEditorPage;
  storefrontBlog: StorefrontBlogPage;
  storefrontBlogPost: StorefrontBlogPostPage;
}

export const test = base.extend<Fixtures>({
  storefrontHome: async ({ page }, use) => {
    await use(new StorefrontHomePage(page));
  },
  adminDashboard: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
  adminLogin: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },
  adminInventory: async ({ page }, use) => {
    await use(new AdminInventoryPage(page));
  },
  adminPricing: async ({ page }, use) => {
    await use(new AdminPricingPage(page));
  },
  adminTaxRules: async ({ page }, use) => {
    await use(new AdminTaxRulesPage(page));
  },
  adminCoupons: async ({ page }, use) => {
    await use(new AdminCouponsPage(page));
  },
  adminCouponDetail: async ({ page }, use) => {
    await use(new AdminCouponDetailPage(page));
  },
  adminCampaigns: async ({ page }, use) => {
    await use(new AdminCampaignsPage(page));
  },
  adminCustomers: async ({ page }, use) => {
    await use(new AdminCustomersPage(page));
  },
  adminCustomerDetail: async ({ page }, use) => {
    await use(new AdminCustomerDetailPage(page));
  },
  adminAuditLogs: async ({ page }, use) => {
    await use(new AdminAuditLogsPage(page));
  },
  adminFeatureFlags: async ({ page }, use) => {
    await use(new AdminFeatureFlagsPage(page));
  },
  adminSettings: async ({ page }, use) => {
    await use(new AdminSettingsPage(page));
  },
  adminReports: async ({ page }, use) => {
    await use(new AdminReportsPage(page));
  },
  storefrontCategory: async ({ page }, use) => {
    await use(new StorefrontCategoryPage(page));
  },
  storefrontProduct: async ({ page }, use) => {
    await use(new StorefrontProductPage(page));
  },
  storefrontCart: async ({ page }, use) => {
    await use(new StorefrontCartPage(page));
  },
  adminPagesList: async ({ page }, use) => {
    await use(new AdminPagesListPage(page));
  },
  adminPageEditor: async ({ page }, use) => {
    await use(new AdminPageEditorPage(page));
  },
  adminBannersList: async ({ page }, use) => {
    await use(new AdminBannersListPage(page));
  },
  adminBlogList: async ({ page }, use) => {
    await use(new AdminBlogListPage(page));
  },
  adminBlogEditor: async ({ page }, use) => {
    await use(new AdminBlogEditorPage(page));
  },
  storefrontBlog: async ({ page }, use) => {
    await use(new StorefrontBlogPage(page));
  },
  storefrontBlogPost: async ({ page }, use) => {
    await use(new StorefrontBlogPostPage(page));
  },
});

export { expect } from "@playwright/test";
