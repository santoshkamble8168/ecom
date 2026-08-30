import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ReportFilter } from "./report-filter";

const meta: Meta<typeof ReportFilter> = {
  title: "Admin/ReportFilter",
  component: ReportFilter,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ReportFilter>;

export const Default: Story = {
  render: function Render() {
    const [from, setFrom] = useState("2026-08-01");
    const [to, setTo] = useState("2026-08-30");
    return (
      <ReportFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={() => undefined}
      />
    );
  },
};
