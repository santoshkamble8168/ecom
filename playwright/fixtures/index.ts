import { test as base } from "@playwright/test";

import { AdminDashboardPage } from "../pages/admin-dashboard.page";
import { StorefrontHomePage } from "../pages/storefront-home.page";

interface Fixtures {
  storefrontHome: StorefrontHomePage;
  adminDashboard: AdminDashboardPage;
}

export const test = base.extend<Fixtures>({
  storefrontHome: async ({ page }, use) => {
    await use(new StorefrontHomePage(page));
  },
  adminDashboard: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
});

export { expect } from "@playwright/test";
