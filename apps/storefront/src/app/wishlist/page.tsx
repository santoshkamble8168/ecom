"use client";

import type { WishlistItem } from "@ecom/types";
import { Button, ProductCard } from "@ecom/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";
import { moveWishlistToCart } from "@/lib/cart";
import { getSessionId } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const token = getToken();
    fetch(`${API_URL}/wishlist?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setItems(body.data);
        else setError(body.error?.message);
      })
      .catch(() => setError("Failed to load wishlist"))
      .finally(() => setLoading(false));
  }, []);

  async function removeItem(id: string) {
    const sessionId = getSessionId();
    const token = getToken();
    await fetch(`${API_URL}/wishlist/items/${id}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleMoveToCart(id: string) {
    try {
      await moveWishlistToCart(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      window.dispatchEvent(new Event("cart-updated"));
      router.push("/cart");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move to cart");
    }
  }

  if (loading) return <div className="p-8 text-neutral-500">Loading wishlist…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-display font-bold">Wishlist</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="text-center">
          <p className="text-neutral-500">Your wishlist is empty.</p>
          <Link href="/men" className="mt-4 inline-block text-brand-700 hover:underline">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              {item.product ? (
                <Link href={`/products/${item.productSlug}`}>
                  <ProductCard product={item.product} />
                </Link>
              ) : (
                <p className="text-sm">{item.productSlug}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => void handleMoveToCart(item.id)}
                >
                  Move to cart
                </Button>
                <Button size="sm" variant="outline" onClick={() => void removeItem(item.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
