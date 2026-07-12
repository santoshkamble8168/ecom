import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";

const METRICS = [
  { label: "Orders Today", value: "0" },
  { label: "Revenue Today", value: "₹0" },
  { label: "Pending Orders", value: "0" },
  { label: "Low Stock Products", value: "0" },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-500">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{metric.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
