import { render, screen } from "@testing-library/react";

import { FunnelChart } from "./funnel-chart";

describe("FunnelChart", () => {
  it("renders sequential funnel steps and conversion copy", () => {
    render(
      <FunnelChart
        steps={[
          { key: "homepage", label: "Homepage", sessions: 10, conversionFromPrevious: null },
          { key: "plp", label: "PLP", sessions: 5, conversionFromPrevious: 0.5 },
        ]}
      />,
    );

    expect(screen.getAllByText("Homepage").length).toBeGreaterThan(0);
    expect(screen.getByText("10 sessions")).toBeInTheDocument();
    expect(screen.getByText("50% from previous")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<FunnelChart steps={[]} />);
    expect(screen.getByText("No funnel data.")).toBeInTheDocument();
  });
});
