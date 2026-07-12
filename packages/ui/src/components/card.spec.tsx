import { render, screen } from "@testing-library/react";

import { Card, CardContent, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("renders composed sub-components with their content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent>Two items in your bag</CardContent>
      </Card>,
    );

    expect(screen.getByText("Order summary")).toBeInTheDocument();
    expect(screen.getByText("Two items in your bag")).toBeInTheDocument();
  });

  it("merges custom class names with the base styles", () => {
    render(<Card className="custom-card" data-testid="card" />);

    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-card");
    expect(card.className).toContain("rounded-lg");
  });
});
