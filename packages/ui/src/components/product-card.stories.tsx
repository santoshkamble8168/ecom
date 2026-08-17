import type { ProductSummary } from "@ecom/types";
import type { Meta, StoryObj } from "@storybook/react";

import { ProductCard } from "./product-card";

const baseProduct: ProductSummary = {
  slug: "linen-blend-shirt",
  title: "Linen Blend Casual Shirt",
  brand: "Northwind",
  status: "published",
  basePrice: "2499.00",
  compareAtPrice: null,
  primaryImage: {
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80",
    altText: "Linen blend casual shirt",
    type: "image",
    sortOrder: 0,
  },
  categorySlugs: ["shirts"],
  publishedAt: "2026-01-10T00:00:00.000Z",
};

const meta: Meta<typeof ProductCard> = {
  title: "Commerce/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  args: {
    product: baseProduct,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

export const Default: Story = {};

export const Draft: Story = {
  args: {
    product: { ...baseProduct, status: "draft" },
  },
};

export const InReview: Story = {
  args: {
    product: { ...baseProduct, status: "review" },
  },
};

export const Archived: Story = {
  args: {
    product: { ...baseProduct, status: "archived" },
  },
};

export const StorefrontWithoutStatus: Story = {
  name: "Storefront (status hidden)",
  args: {
    showStatus: false,
  },
};

/** Sprint 10: a scheduled sale is active — the effective price undercuts the base
 * price, so the base price is struck through and the "Sale" tag appears. */
export const OnSale: Story = {
  args: {
    showStatus: false,
    product: {
      ...baseProduct,
      basePrice: "2499.00",
      effectivePrice: "1999.00",
      saleActive: true,
    },
  },
};

export const WithCompareAtDiscount: Story = {
  name: "Compare-at discount (no active sale)",
  args: {
    showStatus: false,
    product: {
      ...baseProduct,
      basePrice: "2499.00",
      compareAtPrice: "3499.00",
    },
  },
};

export const WithCampaignBadge: Story = {
  args: {
    showStatus: false,
    product: {
      ...baseProduct,
      campaignBadge: "Flash Sale",
    },
  },
};

export const WithWishlistToggled: Story = {
  name: "Wishlist (saved)",
  args: {
    showStatus: false,
    wishlisted: true,
    onToggleWishlist: () => {},
  },
};

export const WithWishlistUnsaved: Story = {
  name: "Wishlist (not saved)",
  args: {
    showStatus: false,
    wishlisted: false,
    onToggleWishlist: () => {},
  },
};

export const NoImage: Story = {
  args: {
    showStatus: false,
    product: { ...baseProduct, primaryImage: null },
  },
};

export const LongTitleAndBrand: Story = {
  name: "Long title/brand (truncation)",
  args: {
    showStatus: false,
    product: {
      ...baseProduct,
      brand: "The Northwind Traders Heritage Collection Company",
      title:
        "Premium Organic Linen Blend Relaxed Fit Casual Button-Down Shirt With Chest Pocket",
    },
  },
};

export const NoPrice: Story = {
  args: {
    showStatus: false,
    product: { ...baseProduct, basePrice: null, compareAtPrice: null },
  },
};
