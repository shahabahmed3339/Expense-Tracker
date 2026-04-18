"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { CATEGORY_TYPE_LABELS } from "@/lib/constants/domain";
import { COMMON_UI } from "@/lib/constants/ui";
import { formatAmount, parseAmountInput } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/date";
import { groupBy } from "@/lib/collections/grouping";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineCreateCategory } from "@/components/dependencies/InlineCreateCategory";
import { AmountText } from "@/components/ui/AmountText";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { MoneyInput } from "@/components/ui/MoneyInput";
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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState<"all" | "recurring" | "one-time">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "over" | "within" | "none">("all");
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [editingBudget, setEditingBudget] = useState<{
    id: string;
    categoryId: string;
    categoryName: string;
    amount: string;
    recurring: boolean;
  } | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: categories } = api.category.list.useQuery();
  const { data: budgets, isLoading, error } = api.budget.listByMonth.useQuery({ month });
  const { data: vs } = api.budget.vsActual.useQuery({ month });
  const { data: budgetDetails, isLoading: isBudgetDetailsLoading } = api.budget.details.useQuery(
    { id: selectedBudgetId ?? "" },
    { enabled: !!selectedBudgetId },
  );

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
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const update = api.budget.upsert.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
      toast.success("Budget updated");
      setEditingBudget(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const del = api.budget.delete.useMutation({
    onSuccess: async () => {
      await utils.budget.listByMonth.invalidate({ month });
      await utils.budget.vsActual.invalidate({ month });
      await utils.dashboard.summary.invalidate();
    },
  });

  const vsByBudgetId = useMemo(() => new Map(vs?.map((row) => [row.budgetId, row]) ?? []), [vs]);

  const rows = useMemo(() => {
    return (budgets ?? []).map((budget) => {
      const comparison = vsByBudgetId.get(budget.id);
      return {
        ...budget,
        spent: comparison?.spent ?? 0,
        remaining: comparison?.remaining ?? 0,
      };
    });
  }, [budgets, vsByBudgetId]);

  const filteredRows = useMemo(() => {
    return rows.filter((budget) => {
      const matchesSearch =
        search.trim().length === 0 ||
        budget.category.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || budget.category.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || budget.categoryId === categoryFilter;
      const matchesRecurring =
        recurringFilter === "all" ||
        (recurringFilter === "recurring" ? budget.isRecurring : !budget.isRecurring);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "over" ? budget.remaining < 0 : false) ||
        (statusFilter === "within" ? budget.remaining >= 0 : false) ||
        (statusFilter === "none" ? budget.spent === 0 : false);

      return matchesSearch && matchesType && matchesCategory && matchesRecurring && matchesStatus;
    });
  }, [categoryFilter, recurringFilter, rows, search, statusFilter, typeFilter]);

  const groupedRows = useMemo(
    () => groupBy(filteredRows, (budget) => budget.category.type),
    [filteredRows],
  );

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Plan by category and month, ordered by most recently updated.</p>
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

      <FilterBar>
        <FilterField label="Search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Category name"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Category">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category type">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value="FIXED">{CATEGORY_TYPE_LABELS.FIXED}</option>
            <option value="VARIABLE">{CATEGORY_TYPE_LABELS.VARIABLE}</option>
          </select>
        </FilterField>
        <FilterField label="Recurring">
          <select
            value={recurringFilter}
            onChange={(event) => setRecurringFilter(event.target.value as typeof recurringFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="recurring">Recurring</option>
            <option value="one-time">One-time</option>
          </select>
        </FilterField>
        <FilterField label="Spend status">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="over">Over budget</option>
            <option value="within">Within budget</option>
            <option value="none">No spend yet</option>
          </select>
        </FilterField>
        <FilterField label="Grouping">
          <label className="flex h-[42px] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--fg)]">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(event) => setGroupByCategory(event.target.checked)}
            />
            Group by category type
          </label>
        </FilterField>
      </FilterBar>

      {!filteredRows.length ? (
        <EmptyState text="No budgets match the current filters." />
      ) : groupByCategory ? (
        <div className="space-y-4">
          {Object.entries(groupedRows).map(([groupName, groupRows]) => (
            <section
              key={groupName}
              className="motion-card overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="font-medium">{CATEGORY_TYPE_LABELS[groupName as keyof typeof CATEGORY_TYPE_LABELS]}</h2>
                <p className="text-xs text-[var(--muted)]">{groupRows.length} budget lines</p>
              </div>
              <BudgetTable
                rows={groupRows}
                onEdit={setEditingBudget}
                onDelete={setBudgetToDelete}
                onOpenDetails={setSelectedBudgetId}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="motion-card overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <BudgetTable
            rows={filteredRows}
            onEdit={setEditingBudget}
            onDelete={setBudgetToDelete}
            onOpenDetails={setSelectedBudgetId}
          />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Budget line">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextAmount = parseAmountInput(amount);
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
              <option value="">{COMMON_UI.selectPlaceholder}</option>
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
            <MoneyInput value={amount} onChange={setAmount} required />
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
            title={upsert.isPending ? COMMON_UI.saving : COMMON_UI.save}
          >
            {upsert.isPending ? COMMON_UI.saving : COMMON_UI.save}
          </button>
        </form>
      </Modal>

      <Modal open={!!editingBudget} onClose={() => setEditingBudget(null)} title="Edit budget line">
        {editingBudget && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextAmount = parseAmountInput(editingBudget.amount);
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
              <MoneyInput
                value={editingBudget.amount}
                onChange={(value) =>
                  setEditingBudget((current) => (current ? { ...current, amount: value } : current))
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
              title={update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}
            >
              {update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        open={!!selectedBudgetId}
        onClose={() => setSelectedBudgetId(null)}
        title={budgetDetails ? `${budgetDetails.budget.category.name} details` : "Budget details"}
        maxWidth="800px"
      >
        {isBudgetDetailsLoading || !budgetDetails ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Budget</p>
                <p className="mt-1 tabular-nums font-semibold">
                  <AmountText value={budgetDetails.budget.amount} />
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Spent</p>
                <p className="mt-1 tabular-nums font-semibold">
                  <AmountText value={budgetDetails.spent} />
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Remaining</p>
                <p className="mt-1 tabular-nums font-semibold">
                  <AmountText value={budgetDetails.remaining} tone="balance" />
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Expenses</p>
                <p className="mt-1 font-semibold">{budgetDetails.expenseCount}</p>
              </div>
            </div>

            {budgetDetails.expenses.length === 0 ? (
              <EmptyState text="No expenses recorded for this budget yet." />
            ) : (
              <div className="rounded-lg border border-[var(--border)]">
                <table className="responsive-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-[var(--muted)]">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                      <th className="px-3 py-2 font-medium">Split</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetDetails.expenses.map((expense) => (
                      <tr key={expense.id} className="motion-row border-t border-[var(--border)]">
                        <td className="px-3 py-2" data-label="Date">{formatShortDate(expense.date)}</td>
                        <td className="px-3 py-2 tabular-nums" data-label="Amount">
                          <AmountText value={expense.amount} />
                        </td>
                        <td className="px-3 py-2" data-label="Note">{expense.note || "-"}</td>
                        <td className="px-3 py-2" data-label="Split">
                          {expense.splits.length > 0 ? `${expense.splits.length} participants` : "No split"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

function BudgetTable({
  rows,
  onEdit,
  onDelete,
  onOpenDetails,
}: {
  rows: {
    id: string;
    amount: number;
    isRecurring: boolean;
    categoryId: string;
    updatedAt: Date;
    category: { name: string; type: "FIXED" | "VARIABLE" };
    spent: number;
    remaining: number;
  }[];
  onEdit: (value: {
    id: string;
    categoryId: string;
    categoryName: string;
    amount: string;
    recurring: boolean;
  }) => void;
  onDelete: (budgetId: string) => void;
  onOpenDetails: (budgetId: string) => void;
}) {
  return (
    <table className="responsive-table w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] bg-[var(--card)] text-left text-[var(--muted)]">
          <th className="p-3">Category</th>
          <th className="p-3">Type</th>
          <th className="p-3 tabular-nums">Budget</th>
          <th className="p-3 tabular-nums">Spent</th>
          <th className="p-3 tabular-nums">Remaining</th>
          <th className="p-3">Recurring</th>
          <th className="p-3" />
        </tr>
      </thead>
      <tbody>
        {rows.map((budget) => (
          <tr
            key={budget.id}
            className="motion-row cursor-pointer border-b border-[var(--border)]/80"
            onClick={() => onOpenDetails(budget.id)}
          >
            <td className="p-3" data-label="Category">{budget.category.name}</td>
            <td className="p-3" data-label="Type">{CATEGORY_TYPE_LABELS[budget.category.type]}</td>
            <td className="p-3 tabular-nums" data-label="Budget"><AmountText value={budget.amount} /></td>
            <td className="p-3 tabular-nums" data-label="Spent"><AmountText value={budget.spent} /></td>
            <td className="p-3 tabular-nums" data-label="Remaining"><AmountText value={budget.remaining} tone="balance" /></td>
            <td className="p-3" data-label="Recurring">{budget.isRecurring ? "Yes" : "No"}</td>
            <td className="p-3 text-right" data-label="Actions" data-actions-cell="true">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="text-sm text-accent hover:underline"
                  aria-label={`Edit budget for ${budget.category.name}`}
                  title="Edit budget"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit({
                      id: budget.id,
                      categoryId: budget.categoryId,
                      categoryName: budget.category.name,
                      amount: formatAmount(budget.amount),
                      recurring: budget.isRecurring,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-red-400 transition-colors hover:underline"
                  aria-label={`Delete budget for ${budget.category.name}`}
                  title="Delete budget"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(budget.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
