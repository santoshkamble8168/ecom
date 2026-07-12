import { fireEvent, render, screen } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Add to bag</Button>);
    expect(screen.getByRole("button", { name: "Add to bag" })).toBeInTheDocument();
  });

  it("fires onClick when enabled", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("disables the button and sets aria-busy while loading", () => {
    render(<Button isLoading>Saving</Button>);

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("applies the requested variant and size classes", () => {
    render(
      <Button variant="destructive" size="lg">
        Delete
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-danger-600");
    expect(button.className).toContain("h-12");
  });
});
