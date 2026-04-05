"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recurring, setRecurring] = useState(false);

  const utils = api.useUtils();
  const { data: categories } = api.category.list.useQuery();
  const { data: budgets, isLoading, error } = api.budget.listByMonth.useQuery({ month });
  const { data: vs } = api.budget.vsActual.useQuery({ month });

  const upsert = api.budget.upsert.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
      toast.success("Budget saved");
      setOpen(false);
      setAmount("");
      setCategoryId("");
      setRecurring(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const del = api.budget.delete.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
    },
  });

  const vsByBudgetId = useMemo(() => {
    const m = new Map(vs?.map((r) => [r.budgetId, r]) ?? []);
    return m;
  }, [vs]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Plan by category and month.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--muted)]">
            Month{" "}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="ml-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
            />
          </label>
          <Button onClick={() => setOpen(true)}>Add budget</Button>
        </div>
      </div>

      {!budgets?.length ? (
        <EmptyState text="No budgets for this month." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--card)] text-left text-[var(--muted)]">
                <th className="p-3">Category</th>
                <th className="p-3 tabular-nums">Budget</th>
                <th className="p-3 tabular-nums">Spent</th>
                <th className="p-3 tabular-nums">Remaining</th>
                <th className="p-3">Recurring</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const row = vsByBudgetId.get(b.id);
                return (
                  <tr key={b.id} className="border-b border-[var(--border)]/80">
                    <td className="p-3">{b.category.name}</td>
                    <td className="p-3 tabular-nums">{b.amount.toFixed(2)}</td>
                    <td className="p-3 tabular-nums">{row?.spent.toFixed(2) ?? "—"}</td>
                    <td
                      className={`p-3 tabular-nums ${
                        row && row.remaining < 0 ? "text-red-400" : ""
                      }`}
                    >
                      {row ? row.remaining.toFixed(2) : "—"}
                    </td>
                    <td className="p-3">{b.isRecurring ? "Yes" : "No"}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className="text-red-400 text-xs hover:underline"
                        onClick={() => {
                          if (confirm("Remove this budget line?")) del.mutate(b.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Budget line">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseFloat(amount);
            if (Number.isNaN(n) || n < 0) {
              toast.error("Enter a valid amount");
              return;
            }
            if (!categoryId) {
              toast.error("Pick a category");
              return;
            }
            upsert.mutate({
              month,
              categoryId,
              amount: n,
              isRecurring: recurring,
            });
          }}
        >
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Recurring
          </label>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
          >
            {upsert.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
