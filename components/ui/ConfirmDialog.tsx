"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "default",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="motion-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="motion-dialog-in dialog-surface w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:rounded-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-[var(--fg)]">
          {title}
        </p>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[var(--nav-hover)]"
            aria-label={cancelText}
            title={cancelText}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-transform duration-200 hover:-translate-y-0.5 ${
              tone === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:bg-accent-dim"
            }`}
            aria-label={confirmText}
            title={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
