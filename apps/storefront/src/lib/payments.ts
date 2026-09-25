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

function sessionBody(): { sessionId: string } {
  return { sessionId: getSessionId() };
}

function sessionQuery(): string {
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
    body: JSON.stringify(sessionBody()),
  });
  return parseResponse(response);
}

export async function confirmRazorpayPayment(
  paymentId: string,
  params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
): Promise<RazorpayMockCaptureResult> {
  const response = await fetch(`${API_URL}/payments/${paymentId}/confirm${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ...params, ...sessionBody() }),
  });
  return parseResponse(response);
}

function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const existing = (window as Window & { Razorpay?: unknown }).Razorpay;
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(script);
  });
}

export async function payWithRazorpay(payment: PaymentSummary, prefill?: {
  name?: string;
  email?: string;
  contact?: string;
}): Promise<RazorpayMockCaptureResult> {
  const checkout = payment.razorpay;
  if (!checkout?.keyId || !payment.providerOrderId) {
    throw new Error("Payment could not be started");
  }
  const useHostedCheckout = Boolean(checkout.keyId) && !checkout.keyId.includes("mock") && checkout.mock !== true;
  if (!useHostedCheckout) {
    return mockCapturePayment(payment.id);
  }

  await loadRazorpayCheckout();
  const Razorpay = (window as Window & {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }).Razorpay;

  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      key: checkout.keyId,
      amount: checkout.amountPaise,
      currency: checkout.currency || payment.currency,
      order_id: payment.providerOrderId,
      name: "Ecom",
      prefill,
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        confirmRazorpayPayment(payment.id, {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
          .then(resolve)
          .catch(reject);
      },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled")),
      },
    });
    instance.open();
  });
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
