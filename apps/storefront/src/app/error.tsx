"use client";

import { Button } from "@ecom/ui";
import { useEffect } from "react";


export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-32 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-neutral-600 dark:text-neutral-400">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
