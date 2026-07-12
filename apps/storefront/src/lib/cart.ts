import type { ApiResponse, CartSummary } from "@ecom/types";

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

function sessionQuery(): string {
  const token = getToken();
  if (token) return "";
  return `?sessionId=${encodeURIComponent(getSessionId())}`;
}

async function parseCartResponse(response: Response): Promise<CartSummary> {
  const body = (await response.json()) as ApiResponse<CartSummary>;
  if (!body.success) throw new Error(body.error.message);
  return body.data;
}

export async function fetchCart(): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart${sessionQuery()}`, {
    headers: authHeaders(),
  });
  return parseCartResponse(response);
}

export async function addToCart(productSlug: string, variantSku: string, quantity = 1): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/items`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      productSlug,
      variantSku,
      quantity,
      sessionId: getToken() ? undefined : getSessionId(),
    }),
  });
  return parseCartResponse(response);
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/items/${itemId}${sessionQuery()}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ quantity }),
  });
  return parseCartResponse(response);
}

export async function removeCartItem(itemId: string): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/items/${itemId}${sessionQuery()}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseCartResponse(response);
}

export async function applyCoupon(code: string): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/coupons`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      code,
      sessionId: getToken() ? undefined : getSessionId(),
    }),
  });
  return parseCartResponse(response);
}

export async function removeCoupon(code: string): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/coupons/${encodeURIComponent(code)}${sessionQuery()}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseCartResponse(response);
}

export async function saveForLater(itemId: string): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/save-for-later`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      itemId,
      sessionId: getToken() ? undefined : getSessionId(),
    }),
  });
  return parseCartResponse(response);
}

export async function moveToCart(itemId: string): Promise<CartSummary> {
  const response = await fetch(`${API_URL}/cart/items/${itemId}/move-to-cart${sessionQuery()}`, {
    method: "POST",
    headers: authHeaders(),
  });
  return parseCartResponse(response);
}

export async function mergeCartOnLogin(): Promise<void> {
  const token = getToken();
  if (!token) return;
  await fetch(`${API_URL}/cart/merge`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ sessionId: getSessionId() }),
  });
}

export async function moveWishlistToCart(wishlistItemId: string): Promise<CartSummary> {
  const response = await fetch(
    `${API_URL}/cart/wishlist/${wishlistItemId}/move-to-cart${sessionQuery()}`,
    {
      method: "POST",
      headers: authHeaders(),
    },
  );
  return parseCartResponse(response);
}

export function formatInr(amount: string | number): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
