"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-[var(--fg)]">Something went wrong</h2>
      <p className="text-sm text-[var(--muted)]">An unexpected error occurred. Please try again.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
