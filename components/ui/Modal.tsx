"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

const modalStack: symbol[] = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  onConfirm,
  maxWidth,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  maxWidth?: string;
}) {
  const hydrated = useHydrated();
  const modalId = useRef(Symbol("modal"));

  useEffect(() => {
    if (!open || !hydrated) return;

    const id = modalId.current;
    modalStack.push(id);

    return () => {
      const index = modalStack.lastIndexOf(id);
      if (index >= 0) {
        modalStack.splice(index, 1);
      }
    };
  }, [hydrated, open]);

  const isTopModal = () => modalStack[modalStack.length - 1] === modalId.current;

  useKeyboardShortcuts([
    {
      key: "Escape",
      action: () => {
        if (isTopModal()) {
          onClose();
        }
      },
    },
    ...(onConfirm ? [{
      key: "Enter",
      action: () => {
        if (isTopModal()) {
          onConfirm();
        }
      },
    }] : []),
  ], open);

  if (!open || !hydrated) return null;

  return createPortal(
    <div
      className="motion-fade-in fixed inset-0 z-50 flex justify-center bg-[var(--overlay)] items-center p-4"
      onClick={onClose}
    >
      <div
        className={`motion-dialog-in dialog-surface flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] max-w-${maxWidth ? `[${maxWidth}]` : "md" }`}
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
            className="w-full rounded-md border border-[var(--border)] px-3 text-sm text-[var(--fg)] transition-colors hover:bg-[var(--nav-hover)] min-h-0 py-2"
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
