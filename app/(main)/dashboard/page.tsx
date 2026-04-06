"use client";

import dynamic from "next/dynamic";
import { api } from "@/lib/trpc";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";

const LazyMultiChart = dynamic(
  () => import("@/components/Charts").then((mod) => mod.MultiChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center sm:h-64 md:h-72">
        <Loader />
      </div>
    ),
  },
);

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "danger";
}) {
  const toneClass =
    tone === "good" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : "text-[var(--fg)]";

  return (
    <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = api.dashboard.summary.useQuery();

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const chartData = data.trend.map((t) => ({
    month: t.month,
    expense: t.amount,
  }));
  const categorySummary = data.categorySummary ?? { total: 0, fixed: 0, variable: 0 };
  const budgetSummary = data.budgetSummary ?? { total: 0, recurring: 0 };
  const expenseSummary = data.expenseSummary ?? { total: 0, thisMonth: 0, splitThisMonth: 0 };
  const peopleSummary = data.peopleSummary ?? { total: 0 };
  const loanSummary = data.loanSummary ?? {
    total: 0,
    receivableCount: 0,
    payableCount: 0,
    receivableOutstanding: 0,
    payableOutstanding: 0,
    netPosition: 0,
  };
  const recentExpenses = data.recentExpenses ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Overview for <span className="text-[var(--fg)]">{data.month}</span> across expenses, budgets, categories,
          people, loans, and splits.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)]">Financial snapshot</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Budgeted this month" value={data.budgetedThisMonth.toFixed(2)} hint={`${budgetSummary.total} budget lines this month.`} />
          <StatCard label="Spent this month" value={data.spentThisMonth.toFixed(2)} hint="Your effective burden after paid split shares." />
          <StatCard
            label="Remaining this month"
            value={data.remainingThisMonth.toFixed(2)}
            tone={data.remainingThisMonth < 0 ? "danger" : "good"}
            hint={data.remainingThisMonth < 0 ? "You are over the current month budget." : "Still available before hitting budget."}
          />
          <StatCard
            label="Net loan position"
            value={loanSummary.netPosition.toFixed(2)}
            tone={loanSummary.netPosition < 0 ? "danger" : "good"}
            hint="Receivables minus payables."
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="motion-card min-w-0 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 overflow-x-auto">
          <h2 className="mb-4 text-sm font-medium text-[var(--muted)]">Expense trend</h2>
          <LazyMultiChart data={chartData} />
        </div>

        <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Workspace summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Categories</p>
              <p className="mt-1 text-lg font-semibold">{categorySummary.total}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {categorySummary.fixed} fixed, {categorySummary.variable} variable
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Expenses</p>
              <p className="mt-1 text-lg font-semibold">{expenseSummary.total}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {expenseSummary.thisMonth} this month, {expenseSummary.splitThisMonth} split expenses this month
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Budgets</p>
              <p className="mt-1 text-lg font-semibold">{budgetSummary.total}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{budgetSummary.recurring} recurring this month</p>
            </div>
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">People</p>
              <p className="mt-1 text-lg font-semibold">{peopleSummary.total}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Available for splits and loans</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Loan summary</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Receivables</p>
              <p className="mt-1 text-lg font-semibold">{loanSummary.receivableOutstanding.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{loanSummary.receivableCount} open receivable loans</p>
            </div>
            <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--bg)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Payables</p>
              <p className="mt-1 text-lg font-semibold">{loanSummary.payableOutstanding.toFixed(2)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{loanSummary.payableCount} open payable loans</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">{loanSummary.total} total loans tracked in the workspace.</p>
        </div>

        <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Recent expenses</h2>
          <ul className="divide-y divide-[var(--border)]">
            {recentExpenses.length === 0 ? (
              <li className="py-3 text-sm text-[var(--muted)]">No expenses yet.</li>
            ) : (
              recentExpenses.map((expense) => (
                <li key={expense.id} className="motion-row flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{expense.categoryName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(expense.date).toLocaleDateString()} · {expense.splitCount > 0 ? `${expense.splitCount} participants in split` : "No split"}
                    </p>
                    {expense.note ? <p className="truncate text-xs text-[var(--muted)]">{expense.note}</p> : null}
                  </div>
                  <span className="tabular-nums font-medium">{expense.amount.toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Top categories by spend</h2>
        <ul className="divide-y divide-[var(--border)]">
          {data.byCategory.length === 0 && <li className="py-3 text-sm text-[var(--muted)]">No expenses yet.</li>}
          {data.byCategory.map((category) => (
            <li key={category.categoryId} className="motion-row flex justify-between gap-3 rounded-md px-2 py-2 text-sm">
              <span className="min-w-0 truncate">{category.categoryName}</span>
              <span className="tabular-nums">{category.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
