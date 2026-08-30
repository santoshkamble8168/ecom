import { render, screen } from "@testing-library/react";

import { CohortTable } from "./cohort-table";

describe("CohortTable", () => {
  it("renders cohort rows", () => {
    render(
      <CohortTable
        cohorts={[{ cohortMonth: "2026-08", customers: 10, repeatCustomers: 2, repeatRate: 0.2 }]}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2026-08")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    render(<CohortTable cohorts={[]} />);
    expect(screen.getByText("No cohort data.")).toBeInTheDocument();
  });
});
