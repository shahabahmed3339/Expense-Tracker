"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

export function Modal({
  open,
  onClose,
  title,
  children,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useKeyboardShortcuts([
    {
      key: "Escape",
      action: onClose,
    },
    ...(onConfirm ? [{
      key: "Enter",
      action: onConfirm,
    }] : []),
  ]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="motion-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="motion-dialog-in dialog-surface flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-xl border border-[var(--border)] bg-[var(--card)] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--fg)]">{title}</h2>
          </div>
        )}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-11 rounded-md border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--fg)] transition-colors hover:bg-[var(--nav-hover)] sm:min-h-0 sm:py-2"
            aria-label="Close dialog"
            title="Close"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
