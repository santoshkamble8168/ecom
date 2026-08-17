import { fireEvent, render, screen } from "@testing-library/react";

import { SettingsForm } from "./settings-form";

const settings = [
  { key: "store.name", value: "Ecom Store" },
  { key: "checkout.guest_enabled", value: true },
];

describe("SettingsForm", () => {
  it("renders boolean settings as checkboxes", () => {
    render(<SettingsForm settings={settings} onSubmit={jest.fn()} />);

    expect(screen.getByRole("checkbox", { name: "checkout.guest_enabled" })).toBeChecked();
    expect(screen.getByLabelText("store.name")).toHaveValue("Ecom Store");
  });

  it("submits current field values", () => {
    const onSubmit = jest.fn();
    render(<SettingsForm settings={settings} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("store.name"), { target: { value: "New Store" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "checkout.guest_enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(onSubmit).toHaveBeenCalledWith({
      "store.name": "New Store",
      "checkout.guest_enabled": false,
    });
  });
});
