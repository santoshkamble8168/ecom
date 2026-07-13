import type {
  ApiResponse,
  CheckoutReviewResult,
  CheckoutSession,
  CustomerAddress,
  PreparedOrderResult,
  ShippingOption,
} from "@ecom/types";

import { getToken } from "./auth";
import { getSessionId } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function sessionBody(): { sessionId?: string } {
  const token = getToken();
  return token ? {} : { sessionId: getSessionId() };
}

function sessionQuery(): string {
  const token = getToken();
  if (token) return "";
  return `?sessionId=${encodeURIComponent(getSessionId())}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

export async function createCheckout(): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(sessionBody()),
  });
  return parseResponse(response);
}

export async function fetchCheckout(id: string): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/checkout/${id}${sessionQuery()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function fetchShippingOptions(id: string): Promise<ShippingOption[]> {
  const response = await fetch(`${API_URL}/checkout/${id}/shipping-options${sessionQuery()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function updateCheckoutAddress(
  id: string,
  params: { addressId?: string; guestAddress?: Omit<CustomerAddress, "id" | "createdAt" | "updatedAt"> },
): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/checkout/${id}/address`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ ...params, ...sessionBody() }),
  });
  return parseResponse(response);
}

export async function updateCheckoutShipping(
  id: string,
  shippingMethodCode: string,
): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/checkout/${id}/shipping`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ shippingMethodCode, ...sessionBody() }),
  });
  return parseResponse(response);
}

export async function updateCheckoutPayment(
  id: string,
  paymentMethod: "razorpay" | "cod",
): Promise<CheckoutSession> {
  const response = await fetch(`${API_URL}/checkout/${id}/payment-method`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ paymentMethod, ...sessionBody() }),
  });
  return parseResponse(response);
}

export async function reviewCheckout(id: string): Promise<CheckoutReviewResult> {
  const response = await fetch(`${API_URL}/checkout/${id}/review${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function placeOrder(id: string, idempotencyKey: string): Promise<PreparedOrderResult> {
  const response = await fetch(`${API_URL}/checkout/${id}/place-order${sessionQuery()}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Idempotency-Key": idempotencyKey,
    },
  });
  return parseResponse(response);
}

export function formatInr(amount: string | number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
