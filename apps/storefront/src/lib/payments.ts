import { getApiUrl } from "@/lib/api-url";
import type {
  ApiResponse,
  CodConfirmationResult,
  OrderConfirmation,
  PaymentSummary,
  RazorpayMockCaptureResult,
} from "@ecom/types";

import { getToken } from "./auth";
import { getSessionId } from "./session";

const API_URL = getApiUrl();

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function sessionBody(): { sessionId?: string } {
  return getToken() ? {} : { sessionId: getSessionId() };
}

function sessionQuery(): string {
  if (getToken()) return "";
  return `?sessionId=${encodeURIComponent(getSessionId())}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

export async function initiatePayment(checkoutId: string): Promise<PaymentSummary> {
  const response = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ checkoutId, ...sessionBody() }),
  });
  return parseResponse(response);
}

export async function confirmCod(checkoutId: string): Promise<CodConfirmationResult> {
  const response = await fetch(`${API_URL}/checkout/${checkoutId}/cod${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(sessionBody()),
  });
  return parseResponse(response);
}

export async function mockCapturePayment(paymentId: string): Promise<RazorpayMockCaptureResult> {
  const response = await fetch(`${API_URL}/payments/${paymentId}/mock-capture${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function retryPayment(paymentId: string): Promise<PaymentSummary> {
  const response = await fetch(`${API_URL}/payments/${paymentId}/retry${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function fetchOrder(orderNumber: string): Promise<OrderConfirmation> {
  const response = await fetch(`${API_URL}/orders/${orderNumber}${sessionQuery()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}
