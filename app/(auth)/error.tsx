"use client";

import { Button } from "@/components/ui/Button";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="auth-card flex flex-col gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Authentication error</h2>
      <p className="text-sm text-[var(--muted)]">Something went wrong. Please try again.</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
