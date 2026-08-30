import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateEditorShell } from "./template-editor-shell";

const props = {
  templateKey: "order.confirmed",
  name: "Order confirmation",
  subject: "Your order {{orderNumber}} is confirmed",
  body: "<p>Hi {{customerName}}</p>",
  requiredVariables: ["orderNumber", "customerName"],
};

describe("TemplateEditorShell", () => {
  it("renders the key, name, fields, and variable chips", () => {
    render(<TemplateEditorShell {...props} onSubjectChange={jest.fn()} onBodyChange={jest.fn()} />);

    expect(screen.getByText("order.confirmed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order confirmation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue("Your order {{orderNumber}} is confirmed");
    expect(screen.getByLabelText("Body (HTML)")).toHaveValue("<p>Hi {{customerName}}</p>");
    expect(screen.getByText("{{orderNumber}}")).toBeInTheDocument();
    expect(screen.getByText("{{customerName}}")).toBeInTheDocument();
  });

  it("calls preview and test-send callbacks", () => {
    const onPreview = jest.fn();
    const onTestSend = jest.fn();
    render(<TemplateEditorShell {...props} onPreview={onPreview} onTestSend={onTestSend} />);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Test send" }));

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onTestSend).toHaveBeenCalledTimes(1);
  });
});
