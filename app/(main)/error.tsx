"use client";

import { Button } from "@/components/ui/Button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="motion-page flex flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold text-[var(--fg)]">Unable to load this page</h2>
      <p className="text-sm text-[var(--muted)]">{error.message || "Please try again."}</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
