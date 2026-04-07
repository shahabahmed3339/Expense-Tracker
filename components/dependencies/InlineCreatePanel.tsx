"use client";

import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

export function InlineCreatePanel({
  open,
  showToggle = true,
  helperText,
  toggleLabel,
  submitLabel,
  pendingLabel = "Saving...",
  isPending,
  onToggle,
  onSubmit,
  children,
}: {
  open: boolean;
  showToggle?: boolean;
  helperText: string;
  toggleLabel: string;
  submitLabel: string;
  pendingLabel?: string;
  isPending: boolean;
  onToggle: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  useKeyboardShortcuts(
    open
      ? [
          {
            key: "Enter",
            action: onSubmit,
          },
        ]
      : [],
  );

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-[var(--border)] p-3">
      {showToggle && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">{helperText}</p>
          <button
            type="button"
            className="text-sm font-medium text-accent hover:underline"
            onClick={onToggle}
            aria-label={open ? "Cancel inline creation" : toggleLabel}
            title={open ? "Cancel" : toggleLabel}
          >
            {open ? "Cancel" : toggleLabel}
          </button>
        </div>
      )}

      {open && (
        <div className="space-y-3">
          {children}
          <button
            type="button"
            disabled={isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
            onClick={onSubmit}
            aria-label={isPending ? pendingLabel : submitLabel}
            title={isPending ? pendingLabel : submitLabel}
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
