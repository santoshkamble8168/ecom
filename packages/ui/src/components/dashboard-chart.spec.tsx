import { render, screen } from "@testing-library/react";

import { DashboardChart } from "./dashboard-chart";

describe("DashboardChart", () => {
  it("exposes an accessible name on the figure", () => {
    render(
      <DashboardChart
        label="Revenue trend"
        unit="INR"
        points={[
          { date: "2026-08-10", value: 100 },
          { date: "2026-08-11", value: 140 },
        ]}
      />,
    );

    expect(screen.getByRole("figure", { name: "Revenue trend (INR)" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no points", () => {
    render(<DashboardChart label="Revenue trend" points={[]} />);

    expect(screen.getByText("No data to display.")).toBeInTheDocument();
  });
});
