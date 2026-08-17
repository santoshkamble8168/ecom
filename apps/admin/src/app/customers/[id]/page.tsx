"use client";

import type { AdminCustomerDetail } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle, CustomerTimeline } from "@ecom/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AddNoteForm } from "@/components/customers/add-note-form";
import { CustomerStatusPill } from "@/components/customers/customer-status-pill";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: customer, isLoading, isError, error } = useQuery({
    queryKey: ["admin-customer", customerId],
    queryFn: () => apiFetch<AdminCustomerDetail>(`/admin/customers/${customerId}`),
    enabled: Boolean(customerId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: "active" | "suspended") =>
      apiFetch<AdminCustomerDetail>(`/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      setStatusError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (err: Error) => setStatusError(err.message),
  });

  function confirmStatus(next: "active" | "suspended") {
    const label = next === "suspended" ? "Suspend" : "Activate";
    const target = customer?.displayName ?? customer?.email ?? "this customer";
    if (!window.confirm(`${label} ${target}?`)) return;
    statusMutation.mutate(next);
  }

  if (isLoading) {
    return <p className="text-neutral-500">Loading customer…</p>;
  }

  if (isError || !customer) {
    return (
      <p className="text-danger-600">
        {error instanceof Error ? error.message : "Failed to load customer."}
      </p>
    );
  }

  const preferences = customer.profile.preferences;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-display font-bold">
              {customer.displayName ?? customer.email ?? "Customer"}
            </h1>
            <CustomerStatusPill status={customer.status} />
          </div>
          <p className="text-sm text-neutral-500">Joined {formatDateTime(customer.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {customer.status !== "suspended" ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => confirmStatus("suspended")}
            >
              Suspend
            </Button>
          ) : null}
          {customer.status !== "active" ? (
            <Button
              type="button"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => confirmStatus("active")}
            >
              Activate
            </Button>
          ) : null}
          <Link href="/customers" className="text-sm text-brand-600 hover:underline">
            ← Back to customers
          </Link>
        </div>
      </div>
      {statusError ? <p className="text-sm text-danger-600">{statusError}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              <span className="text-neutral-500">Email: </span>
              {customer.email ?? "—"}
            </p>
            <p>
              <span className="text-neutral-500">Phone: </span>
              {customer.phone ?? "—"}
            </p>
            <p>
              <span className="text-neutral-500">Loyalty points: </span>
              {customer.loyaltyPoints}
            </p>
            <div className="mt-3">
              <p className="mb-1 font-medium">Preferences</p>
              {Object.keys(preferences).length === 0 ? (
                <p className="text-neutral-500">No marketing preferences on file.</p>
              ) : (
                <pre className="overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs dark:bg-neutral-800">
                  {JSON.stringify(preferences, null, 2)}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loyalty</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-bold">{customer.loyaltyPoints}</p>
            <p className="text-neutral-500">Current points balance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-neutral-500">No addresses.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Label</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Address</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.addresses.map((address) => (
                    <tr key={address.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2">{address.label ?? "—"}</td>
                      <td className="px-3 py-2">{address.fullName}</td>
                      <td className="px-3 py-2">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                        {`, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`}
                      </td>
                      <td className="px-3 py-2">{address.phone}</td>
                      <td className="px-3 py-2">{address.isDefault ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-neutral-500">No orders.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Order #</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Total</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2">
                        <Link href={`/orders/${order.id}`} className="font-mono text-xs text-brand-600 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2 capitalize">{order.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2">{formatCurrency(order.total)}</td>
                      <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Returns</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.returns.length === 0 ? (
              <p className="text-sm text-neutral-500">No returns.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Return</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.returns.map((item) => (
                      <tr key={item.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                        <td className="px-3 py-2 capitalize">{item.status.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.reviews.length === 0 ? (
              <p className="text-sm text-neutral-500">No reviews.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Title</th>
                      <th className="px-3 py-2 text-left font-medium">Rating</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.reviews.map((review) => (
                      <tr key={review.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{review.title ?? review.productId}</td>
                        <td className="px-3 py-2">{review.rating}</td>
                        <td className="px-3 py-2 capitalize">{review.status.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2">{formatDate(review.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {customer.notes.length === 0 ? (
            <p className="text-sm text-neutral-500">No support notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {customer.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                >
                  <p>{note.body}</p>
                  <p className="mt-1 text-neutral-500">
                    {note.authorEmail ?? note.authorId} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <AddNoteForm customerId={customer.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerTimeline events={customer.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
