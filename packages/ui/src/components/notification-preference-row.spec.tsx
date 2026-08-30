import { fireEvent, render, screen } from "@testing-library/react";

import { NotificationPreferenceRow } from "./notification-preference-row";

describe("NotificationPreferenceRow", () => {
  it("names the switch after the preference label", () => {
    render(
      <NotificationPreferenceRow
        label="Marketing email"
        description="Promotions and newsletters."
        checked
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("switch", { name: "Marketing email" })).toBeChecked();
    expect(screen.getByText("Promotions and newsletters.")).toBeInTheDocument();
  });

  it("calls onChange with the next checked state", () => {
    const onChange = jest.fn();
    render(<NotificationPreferenceRow label="Marketing SMS" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Marketing SMS" }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disables transactional rows so they cannot be toggled", () => {
    const onChange = jest.fn();
    render(
      <NotificationPreferenceRow
        label="Transactional email"
        checked
        disabled
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("switch", { name: "Transactional email" })).toBeDisabled();
  });
});
