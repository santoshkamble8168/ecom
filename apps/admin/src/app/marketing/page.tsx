"use client";

import type { CreateGiftCardInput, GiftCardSummary, LoyaltyAccountSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import {
  adjustLoyaltyFormSchema,
  createGiftCardFormSchema,
  loyaltyLookupFormSchema,
  type AdjustLoyaltyFormValues,
  type CreateGiftCardFormValues,
  type LoyaltyLookupFormValues,
} from "@ecom/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/form/field-error";
import { apiFetch } from "@/lib/api";
import { fromDatetimeLocalValue } from "@/lib/datetime";
import { formatDate, formatDateTime } from "@/lib/format";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const PAGE_SIZE = 20;

interface AdminReferralCodeSummary {
  userId: string;
  code: string;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
}

interface AdminReferralListResult {
  referrals: AdminReferralCodeSummary[];
  total: number;
  page: number;
  pageSize: number;
}

interface GiftCardListResult {
  giftCards: GiftCardSummary[];
  total: number;
  page: number;
  pageSize: number;
}

type Tab = "referrals" | "gift-cards" | "loyalty";

const TABS: { id: Tab; label: string }[] = [
  { id: "referrals", label: "Referrals" },
  { id: "gift-cards", label: "Gift Cards" },
  { id: "loyalty", label: "Loyalty" },
];

function TabButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      }`}
    >
      {tab === "referrals" && "Referrals"}
      {tab === "gift-cards" && "Gift Cards"}
      {tab === "loyalty" && "Loyalty"}
    </button>
  );
}

function ReferralsPanel() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-referrals", { page }],
    queryFn: () =>
      apiFetch<AdminReferralListResult>(
        `/admin/marketing/referrals?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Referral codes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <p className="text-neutral-500">Loading referrals…</p>}
        {isError && (
          <p className="text-danger-600">
            {error instanceof Error ? error.message : "Failed to load referrals."}
          </p>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.referrals.map((referral) => (
                  <tr key={referral.userId} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{referral.customerName ?? "—"}</p>
                      <p className="text-neutral-500">{referral.customerEmail ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{referral.code}</td>
                    <td className="px-4 py-3">{formatDate(referral.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.referrals.length === 0 && (
              <p className="p-6 text-center text-neutral-500">No referral codes yet.</p>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-neutral-500">
              Page {data.page} of {totalPages} · {data.total} referrals
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GiftCardsPanel() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGiftCardFormValues>({
    resolver: zodResolver(createGiftCardFormSchema),
    defaultValues: { initialValue: "", expiresAt: "" },
  });

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin-gift-cards", { page }],
    queryFn: () =>
      apiFetch<GiftCardListResult>(`/admin/marketing/gift-cards?page=${page}&pageSize=${PAGE_SIZE}`),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const createMutation = useMutation({
    mutationFn: (values: CreateGiftCardFormValues) => {
      const payload: CreateGiftCardInput = {
        initialValue: values.initialValue.trim(),
        expiresAt: fromDatetimeLocalValue(values.expiresAt) ?? undefined,
      };
      return apiFetch<GiftCardSummary>(`/admin/marketing/gift-cards`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setError(null);
      reset({ initialValue: "", expiresAt: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-gift-cards"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue new gift card</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          >
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="gift-card-value">
                Initial value
              </label>
              <input
                id="gift-card-value"
                type="text"
                placeholder="e.g. 500.00"
                {...register("initialValue")}
                className={INPUT_CLASS}
              />
              <FieldError message={errors.initialValue?.message} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="gift-card-expires">
                Expires at (optional)
              </label>
              <input
                id="gift-card-expires"
                type="datetime-local"
                {...register("expiresAt")}
                className={INPUT_CLASS}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Issuing…" : "Issue gift card"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gift cards</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading && <p className="text-neutral-500">Loading gift cards…</p>}
          {isError && (
            <p className="text-danger-600">
              {loadError instanceof Error ? loadError.message : "Failed to load gift cards."}
            </p>
          )}

          {!isLoading && !isError && (
            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Initial value</th>
                    <th className="px-4 py-3 text-left font-semibold">Balance</th>
                    <th className="px-4 py-3 text-left font-semibold">Active</th>
                    <th className="px-4 py-3 text-left font-semibold">Expires</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.giftCards.map((card) => (
                    <tr key={card.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-4 py-3 font-mono text-xs">{card.code}</td>
                      <td className="px-4 py-3">{card.initialValue}</td>
                      <td className="px-4 py-3">{card.balance}</td>
                      <td className="px-4 py-3">{card.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{formatDate(card.expiresAt)}</td>
                      <td className="px-4 py-3">{formatDate(card.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.giftCards.length === 0 && (
                <p className="p-6 text-center text-neutral-500">No gift cards issued yet.</p>
              )}
            </div>
          )}

          {data && data.total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-neutral-500">
                Page {data.page} of {totalPages} · {data.total} gift cards
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoyaltyPanel() {
  const queryClient = useQueryClient();
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const lookupForm = useForm<LoyaltyLookupFormValues>({
    resolver: zodResolver(loyaltyLookupFormSchema),
    defaultValues: { userId: "" },
  });
  const adjustForm = useForm<AdjustLoyaltyFormValues>({
    resolver: zodResolver(adjustLoyaltyFormSchema),
    defaultValues: { delta: "", reason: "" },
  });

  const { data: account, isLoading, isError, error } = useQuery({
    queryKey: ["admin-loyalty-account", searchedUserId],
    queryFn: () => apiFetch<LoyaltyAccountSummary>(`/admin/marketing/loyalty/${searchedUserId}`),
    enabled: Boolean(searchedUserId),
  });

  const adjustMutation = useMutation({
    mutationFn: (values: AdjustLoyaltyFormValues) =>
      apiFetch<LoyaltyAccountSummary>(`/admin/marketing/loyalty/${searchedUserId}/adjust`, {
        method: "POST",
        body: JSON.stringify({ delta: Number(values.delta), reason: values.reason.trim() }),
      }),
    onSuccess: () => {
      setAdjustError(null);
      adjustForm.reset({ delta: "", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-loyalty-account", searchedUserId] });
    },
    onError: (err: Error) => setAdjustError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Loyalty account lookup</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-1"
          onSubmit={lookupForm.handleSubmit((values) => setSearchedUserId(values.userId.trim()))}
        >
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="User ID"
              {...lookupForm.register("userId")}
              className={INPUT_CLASS}
            />
            <Button type="submit">Search</Button>
          </div>
          <FieldError message={lookupForm.formState.errors.userId?.message} />
        </form>

        {searchedUserId && isLoading && <p className="text-neutral-500">Loading account…</p>}
        {searchedUserId && isError && (
          <p className="text-danger-600">
            {error instanceof Error ? error.message : "Failed to load loyalty account."}
          </p>
        )}

        {account && (
          <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">User ID</dt>
                <dd className="font-mono text-xs">{account.userId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Points balance</dt>
                <dd className="font-semibold">{account.pointsBalance}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Last updated</dt>
                <dd>{formatDateTime(account.updatedAt)}</dd>
              </div>
            </dl>

            <form
              className="flex flex-col gap-3"
              onSubmit={adjustForm.handleSubmit((values) => adjustMutation.mutate(values))}
            >
              <p className="text-sm font-medium">Adjust points</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400" htmlFor="loyalty-delta">
                    Delta (positive to credit, negative to debit)
                  </label>
                  <input
                    id="loyalty-delta"
                    type="number"
                    {...adjustForm.register("delta")}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={adjustForm.formState.errors.delta?.message} />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400" htmlFor="loyalty-reason">
                    Reason
                  </label>
                  <input
                    id="loyalty-reason"
                    type="text"
                    {...adjustForm.register("reason")}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={adjustForm.formState.errors.reason?.message} />
                </div>
              </div>
              <div>
                <Button type="submit" size="sm" disabled={adjustMutation.isPending}>
                  {adjustMutation.isPending ? "Adjusting…" : "Adjust points"}
                </Button>
              </div>
              {adjustError && <p className="text-sm text-danger-600">{adjustError}</p>}
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>("referrals");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-display font-bold">Marketing</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.id} tab={t.id} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === "referrals" && <ReferralsPanel />}
      {tab === "gift-cards" && <GiftCardsPanel />}
      {tab === "loyalty" && <LoyaltyPanel />}
    </div>
  );
}
