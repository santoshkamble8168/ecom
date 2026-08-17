import { render, screen } from "@testing-library/react";

import { CustomerTimeline } from "./customer-timeline";

describe("CustomerTimeline", () => {
  it("renders events as a list with titles and timestamps", () => {
    render(
      <CustomerTimeline
        events={[
          {
            id: "evt-1",
            kind: "order",
            title: "Placed order #1001",
            detail: "₹2,498 · 3 items",
            createdAt: "2026-08-17T10:12:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Placed order #1001")).toBeInTheDocument();
    expect(screen.getByText("₹2,498 · 3 items")).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("dateTime", "2026-08-17T10:12:00.000Z");
  });

  it("shows an empty state when there are no events", () => {
    render(<CustomerTimeline events={[]} />);

    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });
});
