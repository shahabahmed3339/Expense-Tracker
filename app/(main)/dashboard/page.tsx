"use client";

import { api } from "@/lib/trpc";
import { MultiChart } from "@/components/Charts";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";

export default function DashboardPage() {
  const { data, isLoading, error } = api.dashboard.summary.useQuery();

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const chartData = data.trend.map((t) => ({
    month: t.month,
    expense: t.amount,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Overview for <span className="text-[var(--fg)]">{data.month}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Spent this month</p>
          <p className="text-2xl font-semibold mt-1">{data.spentThisMonth.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Budgeted</p>
          <p className="text-2xl font-semibold mt-1">{data.budgetedThisMonth.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Remaining</p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              data.remainingThisMonth < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {data.remainingThisMonth.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 overflow-x-auto">
        <h2 className="text-sm font-medium text-[var(--muted)] mb-4">Expense trend</h2>
        <MultiChart data={chartData} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-medium text-[var(--muted)] mb-3">By category (all time)</h2>
        <ul className="divide-y divide-[var(--border)]">
          {data.byCategory.length === 0 && (
            <li className="py-3 text-[var(--muted)] text-sm">No expenses yet.</li>
          )}
          {data.byCategory.map((c) => (
            <li key={c.categoryId} className="py-2 flex justify-between text-sm">
              <span>{c.categoryName}</span>
              <span className="tabular-nums">{c.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
