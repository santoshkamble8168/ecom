"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WishlistPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account?tab=wishlist");
  }, [router]);

  return null;
}
