import { render, screen } from "@testing-library/react";

import { KpiCard } from "./kpi-card";

describe("KpiCard", () => {
  it("renders label, value, and definition", () => {
    render(
      <KpiCard
        label="Revenue"
        value="₹4,82,190"
        definition="Gross merchandise value for the selected range."
        deltaLabel="+8.2% vs prior period"
      />,
    );

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹4,82,190")).toBeInTheDocument();
    expect(screen.getByText("Gross merchandise value for the selected range.")).toBeInTheDocument();
    expect(screen.getByText("+8.2% vs prior period")).toBeInTheDocument();
  });

  it("merges custom class names onto the card", () => {
    render(<KpiCard label="AOV" value="₹1,240" className="custom-kpi" data-testid="kpi" />);

    expect(screen.getByTestId("kpi").className).toContain("custom-kpi");
  });
});
