import { fireEvent, render, screen } from "@testing-library/react";

import { FeatureFlagRow } from "./feature-flag-row";

const flag = {
  key: "checkout.express_pay",
  isEnabled: true,
  description: "Show express payment wallets on checkout.",
  environment: "production",
  rolloutPercent: 25,
};

describe("FeatureFlagRow", () => {
  it("names the switch after the flag key", () => {
    render(<FeatureFlagRow flag={flag} onToggle={jest.fn()} />);

    expect(screen.getByRole("switch", { name: "checkout.express_pay" })).toBeChecked();
  });

  it("calls onToggle with the next enabled state", () => {
    const onToggle = jest.fn();
    render(<FeatureFlagRow flag={flag} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("switch", { name: "checkout.express_pay" }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
