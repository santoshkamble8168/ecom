import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

const meta: Meta<typeof Card> = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">2 items in your bag &middot; ₹2,398</p>
        <Button className="w-full">Proceed to checkout</Button>
      </CardContent>
    </Card>
  ),
};
