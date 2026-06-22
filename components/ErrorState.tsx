"use client";

import { Button } from "@/components/ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-6 text-center">
      <p className="text-red-400 text-sm mb-3">
        {message ? message : "Something went wrong"}
      </p>
      {onRetry && (
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
