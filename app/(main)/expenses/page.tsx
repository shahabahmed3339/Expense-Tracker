"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { currentMonthValue } from "@/lib/dates/month";
import { formatAmount } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/date";
import { groupBy } from "@/lib/collections/grouping";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MonthInput } from "@/components/ui/MonthInput";
import { AmountText } from "@/components/ui/AmountText";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import type { ExpenseFormValues } from "./components/ExpenseForm";

const LazyExpenseForm = dynamic(
  () => import("./components/ExpenseForm").then((mod) => mod.ExpenseForm),
  {
    ssr: false,
    loading: () => <div className="flex min-h-40 items-center justify-center"><Loader /></div>,
  },
);

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonthValue);
  const [open, setOpen] = useState(false);
  const [newExpenseValues, setNewExpenseValues] = useState<ExpenseFormValues | null>(null);
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    values: ExpenseFormValues;
  } | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [splitFilter, setSplitFilter] = useState<"all" | "split" | "unsplit">("all");
  const [groupByCategory, setGroupByCategory] = useState(true);

  const { data, isLoading, error } = api.expense.list.useQuery({ month, take: 100 });
  const { data: categories } = api.category.list.useQuery();
  const utils = api.useUtils();

  const del = api.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate({ month, take: 100 });
      await utils.dashboard.summary.invalidate();
    },
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    return items.filter((expense) => {
      const matchesSearch =
        search.trim().length === 0 ||
        [expense.category.name, expense.note ?? "", formatShortDate(expense.date)]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory = categoryId === "all" || expense.categoryId === categoryId;
      const matchesSplit =
        splitFilter === "all" ||
        (splitFilter === "split" ? expense.splits.length > 0 : expense.splits.length === 0);

      return matchesSearch && matchesCategory && matchesSplit;
    });
  }, [categoryId, items, search, splitFilter]);

  const groupedItems = useMemo(
    () => groupBy(filteredItems, (expense) => expense.category.name),
    [filteredItems],
  );

  const defaultExpenseDateForMonth = () => {
    const todayValue = new Date().toISOString().slice(0, 10);
    return todayValue.startsWith(month) ? todayValue : `${month}-01`;
  };

  const openNewExpense = (categoryId?: string) => {
    setNewExpenseValues(
      categoryId
        ? {
            amount: "",
            categoryId,
            date: defaultExpenseDateForMonth(),
            note: "",
          }
        : null,
    );
    setOpen(true);
  };

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Spending for the selected month, ordered by most recently updated.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthInput value={month} onChange={setMonth} />
          <Button onClick={() => openNewExpense()}>Add expense</Button>
        </div>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Category, note, date"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Category">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
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
        <FilterField label="Split status">
          <select
            value={splitFilter}
            onChange={(event) => setSplitFilter(event.target.value as typeof splitFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="split">With splits</option>
            <option value="unsplit">Without splits</option>
          </select>
        </FilterField>
        <FilterField label="Grouping">
          <label className="flex h-[42px] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--fg)]">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(event) => setGroupByCategory(event.target.checked)}
            />
            Group by category
          </label>
        </FilterField>
      </FilterBar>

      {filteredItems.length === 0 ? (
        <EmptyState text="No expenses match the current filters." />
      ) : groupByCategory ? (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([categoryName, expenses]) => (
            <section
              key={categoryName}
              className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{categoryName}</h2>
                  <p className="text-xs text-[var(--muted)]">{expenses.length} expense entries</p>
                </div>
                <Button onClick={() => openNewExpense(expenses[0]?.categoryId)}>
                  Add expense
                </Button>
              </div>
              <ExpenseList
                items={expenses}
                onEdit={setEditingExpense}
                onDelete={setExpenseToDelete}
              />
            </section>
          ))}
        </div>
      ) : (
        <ExpenseList
          items={filteredItems}
          onEdit={setEditingExpense}
          onDelete={setExpenseToDelete}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New expense">
        <LazyExpenseForm
          initialValues={newExpenseValues ?? undefined}
          onSuccess={() => {
            setOpen(false);
            setNewExpenseValues(null);
          }}
        />
      </Modal>

      <Modal
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit expense"
      >
        {editingExpense && (
          <LazyExpenseForm
            expenseId={editingExpense.id}
            initialValues={editingExpense.values}
            onSuccess={() => setEditingExpense(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!expenseToDelete}
        title="Delete expense?"
        description="This deletes the expense and any splits attached to it."
        confirmText="Delete expense"
        tone="danger"
        onClose={() => setExpenseToDelete(null)}
        onConfirm={() => {
          if (!expenseToDelete) return;
          del.mutate(expenseToDelete);
          setExpenseToDelete(null);
        }}
      />
    </div>
  );
}

function ExpenseList({
  items,
  onEdit,
  onDelete,
}: {
  items: {
    id: string;
    amount: number;
    date: Date;
    note: string | null;
    categoryId: string;
    updatedAt: Date;
    category: { name: string };
    splits: { id: string }[];
  }[];
  onEdit: (value: { id: string; values: ExpenseFormValues }) => void;
  onDelete: (expenseId: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((expense) => (
        <li
          key={expense.id}
          className="motion-card flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
        >
          <div>
            <p className="font-medium tabular-nums">
              <AmountText value={expense.amount} />
            </p>
            <p className="text-sm text-[var(--muted)]">
              {expense.category.name} | {formatShortDate(expense.date)}
              {expense.note ? ` | ${expense.note}` : ""}
            </p>
            {expense.splits.length > 0 && (
              <p className="mt-1 text-xs text-accent">Split across {expense.splits.length} people</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              aria-label={`Edit expense ${expense.amount}`}
              title="Edit expense"
              onClick={() =>
                onEdit({
                  id: expense.id,
                  values: {
                    amount: formatAmount(expense.amount),
                    categoryId: expense.categoryId,
                    date: new Date(expense.date).toISOString().slice(0, 10),
                    note: expense.note ?? "",
                  },
                })
              }
            >
              Edit
            </button>
            <button
              type="button"
              className="text-sm text-red-400 transition-colors hover:underline"
              aria-label={`Delete expense ${expense.amount}`}
              title="Delete expense"
              onClick={() => onDelete(expense.id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
