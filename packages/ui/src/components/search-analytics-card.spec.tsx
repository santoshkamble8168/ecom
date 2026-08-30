import { render, screen } from "@testing-library/react";

import { SearchAnalyticsCard } from "./search-analytics-card";

describe("SearchAnalyticsCard", () => {
  it("renders top queries", () => {
    render(
      <SearchAnalyticsCard
        snapshot={{
          from: "2026-08-01T00:00:00.000Z",
          to: "2026-08-30T23:59:59.999Z",
          totalSearches: 10,
          zeroResultRate: 0.2,
          topQueries: [{ query: "hoodie", searches: 10, zeroResults: 2 }],
        }}
      />,
    );

    expect(screen.getByText("hoodie")).toBeInTheDocument();
    expect(screen.getByText("10 searches · 20% zero results")).toBeInTheDocument();
  });
});
