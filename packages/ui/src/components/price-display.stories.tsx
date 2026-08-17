import type { Meta, StoryObj } from "@storybook/react";

import { PriceDisplay } from "./product-card";

const meta: Meta<typeof PriceDisplay> = {
  title: "Commerce/PriceDisplay",
  component: PriceDisplay,
  tags: ["autodocs"],
  args: {
    price: "2499.00",
  },
};

export default meta;
type Story = StoryObj<typeof PriceDisplay>;

export const BasePriceOnly: Story = {};

/** Sprint 10: `effectivePrice` + `saleActive` reflect a currently running scheduled
 * sale — the original price is struck through and a "Sale" tag is shown alongside
 * the computed discount. */
export const SaleActive: Story = {
  args: {
    price: "2499.00",
    effectivePrice: "1999.00",
    saleActive: true,
  },
};

export const SaleScheduledButNotActive: Story = {
  name: "Sale scheduled (not yet active)",
  args: {
    price: "2499.00",
    effectivePrice: "1999.00",
    saleActive: false,
  },
};

export const CompareAtDiscount: Story = {
  name: "Compare-at price (no sale flag)",
  args: {
    price: "2499.00",
    compareAtPrice: "3499.00",
  },
};

export const SaleWithExplicitCompareAt: Story = {
  name: "Sale active with explicit compare-at price",
  args: {
    price: "2499.00",
    compareAtPrice: "3999.00",
    effectivePrice: "1999.00",
    saleActive: true,
  },
};

export const NoPrice: Story = {
  args: {
    price: null,
  },
};
