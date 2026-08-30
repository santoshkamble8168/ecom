import { render, screen } from "@testing-library/react";

import type { DeliveryLogEntry } from "@ecom/types";

import { DeliveryLogTable } from "./delivery-log-table";

const log: DeliveryLogEntry = {
  id: "del-1",
  userId: "user-1",
  templateKey: "order.confirmed",
  channel: "email",
  category: "transactional",
  destination: "customer@ecom.local",
  status: "sent",
  eventType: "order.placed",
  attempt: 1,
  errorMessage: null,
  createdAt: "2026-08-17T11:04:00.000Z",
  sentAt: "2026-08-17T11:04:02.000Z",
};

describe("DeliveryLogTable", () => {
  it("renders delivery rows in a semantic table", () => {
    render(<DeliveryLogTable logs={[log]} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("order.confirmed")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("customer@ecom.local")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("order.placed")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows an empty state when there are no logs", () => {
    render(<DeliveryLogTable logs={[]} />);

    expect(screen.getByText("No delivery logs.")).toBeInTheDocument();
  });
});
