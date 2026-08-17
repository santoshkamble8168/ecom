import type { Meta, StoryObj } from "@storybook/react";

import { FaqAccordion } from "./faq-accordion";

const meta: Meta<typeof FaqAccordion> = {
  title: "Commerce/FaqAccordion",
  component: FaqAccordion,
  tags: ["autodocs"],
  args: {
    items: [
      { question: "How long does delivery take?", answer: "Standard delivery takes 4-7 business days." },
      { question: "What is your return policy?", answer: "You can request a return within 7 days of delivery." },
      { question: "Do you offer exchanges?", answer: "Yes, exchanges are available within 7 days of delivery." },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FaqAccordion>;

export const Default: Story = {};

export const SingleItem: Story = {
  args: { items: [{ question: "How can I track my order?", answer: "Use the tracking link in your shipping email." }] },
};

export const Empty: Story = {
  args: { items: [] },
};

export const LongCopy: Story = {
  args: {
    items: [
      {
        question: "What happens if my order is delayed because of weather, courier capacity, or a warehouse transfer?",
        answer:
          "We will email you as soon as we know. You can still cancel while the order is processing, and once it ships you can track it from the confirmation email or the Track Order page.",
      },
    ],
  },
};
