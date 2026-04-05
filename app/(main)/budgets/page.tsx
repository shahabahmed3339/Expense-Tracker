"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineCreateCategory } from "@/components/dependencies/InlineCreateCategory";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{
    id: string;
    categoryId: string;
    categoryName: string;
    amount: string;
    recurring: boolean;
  } | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

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
    onError: (error) => toast.error(error.message),
  });

  const update = api.budget.upsert.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
      toast.success("Budget updated");
      setEditingBudget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const del = api.budget.delete.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
    },
  });

  const vsByBudgetId = useMemo(() => new Map(vs?.map((row) => [row.budgetId, row]) ?? []), [vs]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Plan by category and month.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--muted)]">
            Month{" "}
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="ml-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
            />
          </label>
          <Button onClick={() => setOpen(true)}>Add budget</Button>
        </div>
      </div>

      {!budgets?.length ? (
        <EmptyState text="No budgets for this month." />
      ) : (
        <div className="motion-card overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="responsive-table w-full text-sm">
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
              {budgets.map((budget) => {
                const row = vsByBudgetId.get(budget.id);
                return (
                  <tr key={budget.id} className="motion-row border-b border-[var(--border)]/80">
                    <td className="p-3" data-label="Category">{budget.category.name}</td>
                    <td className="p-3 tabular-nums" data-label="Budget">{budget.amount.toFixed(2)}</td>
                    <td className="p-3 tabular-nums" data-label="Spent">{row?.spent.toFixed(2) ?? "-"}</td>
                    <td className={`p-3 tabular-nums ${row && row.remaining < 0 ? "text-red-400" : ""}`} data-label="Remaining">
                      {row ? row.remaining.toFixed(2) : "-"}
                    </td>
                    <td className="p-3" data-label="Recurring">{budget.isRecurring ? "Yes" : "No"}</td>
                    <td className="p-3 text-right" data-label="Actions" data-actions-cell="true">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          className="text-sm text-accent hover:underline"
                          aria-label={`Edit budget for ${budget.category.name}`}
                          title="Edit budget"
                          onClick={() =>
                            setEditingBudget({
                              id: budget.id,
                              categoryId: budget.categoryId,
                              categoryName: budget.category.name,
                              amount: String(budget.amount),
                              recurring: budget.isRecurring,
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-400 transition-colors hover:underline"
                          aria-label={`Delete budget for ${budget.category.name}`}
                          title="Delete budget"
                          onClick={() => setBudgetToDelete(budget.id)}
                        >
                          Delete
                        </button>
                      </div>
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
          onSubmit={(event) => {
            event.preventDefault();
            const nextAmount = parseFloat(amount);
            if (Number.isNaN(nextAmount) || nextAmount < 0) {
              toast.error("Enter a valid amount");
              return;
            }
            if (!categoryId) {
              toast.error("Pick a category");
              return;
            }
            upsert.mutate({ month, categoryId, amount: nextAmount, isRecurring: recurring });
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Category</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Select...</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <InlineCreateCategory onCreated={(nextCategoryId) => setCategoryId(nextCategoryId)} />
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
            Recurring
          </label>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
            aria-label={upsert.isPending ? "Saving budget" : "Save budget"}
            title={upsert.isPending ? "Saving..." : "Save"}
          >
            {upsert.isPending ? "Saving..." : "Save"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editingBudget} onClose={() => setEditingBudget(null)} title="Edit budget line">
        {editingBudget && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextAmount = parseFloat(editingBudget.amount);
              if (Number.isNaN(nextAmount) || nextAmount < 0) {
                toast.error("Enter a valid amount");
                return;
              }
              update.mutate({
                month,
                categoryId: editingBudget.categoryId,
                amount: nextAmount,
                isRecurring: editingBudget.recurring,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Category</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]"
                value={editingBudget.categoryName}
                disabled
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingBudget.amount}
                onChange={(event) =>
                  setEditingBudget((current) => (current ? { ...current, amount: event.target.value } : current))
                }
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editingBudget.recurring}
                onChange={(event) =>
                  setEditingBudget((current) => (current ? { ...current, recurring: event.target.checked } : current))
                }
              />
              Recurring
            </label>
            <button
              type="submit"
              disabled={update.isPending}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
              aria-label={update.isPending ? "Saving budget changes" : "Save budget changes"}
              title={update.isPending ? "Saving..." : "Save changes"}
            >
              {update.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!budgetToDelete}
        title="Delete budget line?"
        description="This removes the selected budget for the current month. Recurring budgets can still appear again in a later month."
        confirmText="Delete budget"
        tone="danger"
        onClose={() => setBudgetToDelete(null)}
        onConfirm={() => {
          if (!budgetToDelete) return;
          del.mutate(budgetToDelete);
          setBudgetToDelete(null);
        }}
      />
    </div>
  );
}
