import type { Meta, StoryObj } from "@storybook/react";

import { BannerStrip, HeroBanner } from "./hero-banner";

const meta: Meta<typeof HeroBanner> = {
  title: "Commerce/HeroBanner",
  component: HeroBanner,
  tags: ["autodocs"],
  args: {
    title: "New Season Drop",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600",
    altText: "Model wearing the new season collection",
    linkUrl: "/collections/new-arrivals",
  },
};

export default meta;
type Story = StoryObj<typeof HeroBanner>;

export const LinkedHero: Story = {};

export const UnlinkedHero: Story = {
  args: { linkUrl: null },
};

export const Strip: Story = {
  render: () => (
    <BannerStrip
      banners={[
        {
          id: "1",
          title: "Men",
          imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
          linkUrl: "/men",
        },
        {
          id: "2",
          title: "Women",
          imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800",
          linkUrl: "/women",
        },
        {
          id: "3",
          title: "Sale",
          imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
          linkUrl: "/collections/sale",
        },
      ]}
    />
  ),
};

export const EmptyStrip: Story = {
  render: () => <BannerStrip banners={[]} />,
};
