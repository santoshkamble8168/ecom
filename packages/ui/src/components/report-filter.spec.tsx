import { fireEvent, render, screen } from "@testing-library/react";

import { ReportFilter } from "./report-filter";

describe("ReportFilter", () => {
  it("submits the selected range", () => {
    const onApply = jest.fn();
    render(
      <ReportFilter from="2026-08-01" to="2026-08-30" onFromChange={jest.fn()} onToChange={jest.fn()} onApply={onApply} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Apply range" }));
    expect(onApply).toHaveBeenCalled();
  });
});
