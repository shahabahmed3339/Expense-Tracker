"use client";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-3 sm:items-center sm:p-4">
      <div
        className="max-h-[min(90dvh,100%)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
      >
        {title && <h2 className="text-lg font-semibold mb-3 text-[var(--fg)]">{title}</h2>}
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full min-h-11 rounded-md border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--nav-hover)] sm:min-h-0 sm:py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}
