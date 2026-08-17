import type { Meta, StoryObj } from "@storybook/react";

import { RichHtml } from "./rich-html";

const meta: Meta<typeof RichHtml> = {
  title: "Commerce/RichHtml",
  component: RichHtml,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RichHtml>;

export const Default: Story = {
  args: {
    html: "<h2>Return policy</h2><p>Items can be returned within <strong>7 days</strong> of delivery, provided tags are still attached.</p>",
  },
};

export const WithList: Story = {
  args: {
    html:
      "<h2>Care instructions</h2><ul><li>Machine wash cold</li><li>Do not bleach</li><li>Tumble dry low</li><li>Iron on low heat</li></ul>",
  },
};

export const WithLink: Story = {
  args: {
    html: '<p>Read our full <a href="/pages/shipping-policy">shipping policy</a> for delivery timelines by region.</p>',
  },
};

export const Empty: Story = {
  args: {
    html: "",
  },
};

export const LongContent: Story = {
  args: {
    html: `<h2>Frequently asked questions about fabric care</h2>
<p>Our garments are made from a blend of cotton and recycled polyester, chosen for durability and a soft hand-feel that holds up over repeated washes. Below is a detailed guide to keeping your pieces looking new for longer.</p>
<p>Always wash similar colors together and avoid high heat, which can cause shrinkage and fading over time. When in doubt, air dry flat rather than using a tumble dryer.</p>
<ul>
<li>Turn garments inside out before washing to protect prints</li>
<li>Use a mild, phosphate-free detergent</li>
<li>Avoid fabric softener on moisture-wicking fabrics</li>
</ul>
<p>For any questions not covered here, reach out to our support team.</p>`,
  },
};

export const CustomClassName: Story = {
  args: {
    html: "<p>Renders with an additional utility class applied by the consumer.</p>",
    className: "rounded-lg border border-neutral-200 p-4 dark:border-neutral-800",
  },
};
