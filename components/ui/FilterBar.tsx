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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-[var(--muted)]">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
