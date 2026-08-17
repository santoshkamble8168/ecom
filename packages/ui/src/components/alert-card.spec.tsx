import { render, screen } from "@testing-library/react";

import { AlertCard } from "./alert-card";

describe("AlertCard", () => {
  it("renders as a link when href is provided", () => {
    render(
      <AlertCard
        severity="danger"
        title="Failed payments"
        detail="18 authorizations failed in the last hour."
        href="/orders?payment=failed"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/orders?payment=failed");
    expect(screen.getByText("Failed payments")).toBeInTheDocument();
  });

  it("renders as a non-link surface when href is omitted", () => {
    render(
      <AlertCard severity="info" title="Search no-results spike" detail="142 searches returned no products." />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Search no-results spike")).toBeInTheDocument();
  });
});
