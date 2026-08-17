import { fireEvent, render, screen } from "@testing-library/react";

import { AuditTable, type AuditTableLog } from "./audit-table";

const log: AuditTableLog = {
  id: "log-1",
  action: "customer.suspend",
  actorEmail: "ops@example.com",
  entityType: "customer",
  createdAt: "2026-08-17T11:04:00.000Z",
};

describe("AuditTable", () => {
  it("renders log rows in a semantic table", () => {
    render(<AuditTable logs={[log]} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("customer.suspend")).toBeInTheDocument();
    expect(screen.getByText("ops@example.com")).toBeInTheDocument();
    expect(screen.getByText("customer")).toBeInTheDocument();
  });

  it("calls onRowClick from the row action", () => {
    const onRowClick = jest.fn();
    render(<AuditTable logs={[log]} onRowClick={onRowClick} />);

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(log);
  });
});
