import Link from "next/link";
import { APP_CONFIG } from "@/lib/config/runtime";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-16 text-[var(--fg)]">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">Offline</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">You&apos;re currently offline</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {APP_CONFIG.name} could not reach the network. Reconnect and refresh to sync the latest budgets,
          expenses, and split updates.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim"
          >
            Try dashboard
          </Link>
          <Link
            href="/expenses"
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--nav-hover)]"
          >
            Open expenses
          </Link>
        </div>
      </div>
    </main>
  );
}
