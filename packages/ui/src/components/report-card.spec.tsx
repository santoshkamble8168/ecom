import { fireEvent, render, screen } from "@testing-library/react";

import { ReportCard } from "./report-card";

describe("ReportCard", () => {
  it("renders the report name, kind, and description", () => {
    render(
      <ReportCard
        name="Sales summary"
        kind="sales"
        description="Orders and revenue for the selected range."
      />,
    );

    expect(screen.getByText("Sales summary")).toBeInTheDocument();
    expect(screen.getByText("sales")).toBeInTheDocument();
    expect(screen.getByText("Orders and revenue for the selected range.")).toBeInTheDocument();
  });

  it("fires onExport and can be disabled", () => {
    const onExport = jest.fn();
    const { rerender } = render(
      <ReportCard name="Sales summary" kind="sales" onExport={onExport} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(onExport).toHaveBeenCalledTimes(1);

    rerender(<ReportCard name="Sales summary" kind="sales" onExport={onExport} exportDisabled />);
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });
});
