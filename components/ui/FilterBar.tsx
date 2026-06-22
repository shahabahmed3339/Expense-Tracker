"use client";

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-sm text-[var(--muted)]">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
