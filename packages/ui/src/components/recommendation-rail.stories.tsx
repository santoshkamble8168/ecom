import type { ProductSummary } from "@ecom/types";
import type { Meta, StoryObj } from "@storybook/react";

import { RecommendationRail } from "./recommendation-rail";

const sample: ProductSummary = {
  slug: "classic-crew-neck-tee",
  title: "Classic Crew Neck Tee",
  brand: "ECOM",
  status: "published",
  basePrice: "499.00",
  compareAtPrice: null,
  primaryImage: {
    url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
    altText: "Classic crew neck tee",
    type: "image",
    sortOrder: 0,
  },
  categorySlugs: ["men-t-shirts"],
  publishedAt: "2026-01-10T00:00:00.000Z",
};

const meta: Meta<typeof RecommendationRail> = {
  title: "Commerce/RecommendationRail",
  component: RecommendationRail,
  tags: ["autodocs"],
  args: {
    title: "Trending now",
    products: [sample, { ...sample, slug: "oversized-graphic-tee", title: "Oversized Graphic Tee" }],
    reason: "Newest published products (rule-based trending).",
  },
};

export default meta;
type Story = StoryObj<typeof RecommendationRail>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true, products: [] },
};

export const EmptyFallback: Story = {
  args: {
    products: [],
    emptyLabel: "No similar products yet — browse new arrivals instead.",
  },
};
