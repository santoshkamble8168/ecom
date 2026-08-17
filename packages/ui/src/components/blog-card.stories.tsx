import type { Meta, StoryObj } from "@storybook/react";

import { BlogCard } from "./blog-card";

const meta: Meta<typeof BlogCard> = {
  title: "Commerce/BlogCard",
  component: BlogCard,
  tags: ["autodocs"],
  args: {
    href: "/blog/how-to-style-an-oversized-tee",
    title: "How to Style an Oversized Tee, 5 Ways",
    excerpt: "From layered streetwear to relaxed weekend looks — five ways to wear our oversized fits.",
    coverImageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
    categoryName: "Style Guides",
    authorName: "Editorial Team",
    publishedAt: "2026-08-01T00:00:00.000Z",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BlogCard>;

export const Default: Story = {};

export const NoCoverImage: Story = {
  args: { coverImageUrl: null },
};

export const NoCategoryOrExcerpt: Story = {
  args: { categoryName: null, excerpt: null },
};

export const LongTitleTruncation: Story = {
  args: {
    title:
      "A Completely Exhaustive Field Guide to Styling Oversized Tees Across Every Season, Occasion, and Climate",
    excerpt:
      "This excerpt is intentionally long so we can confirm the two-line clamp still holds when the copy runs well past a typical editorial teaser length used on the blog index.",
  },
};
