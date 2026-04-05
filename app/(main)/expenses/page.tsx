"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { ExpenseForm, type ExpenseFormValues } from "./components/ExpenseForm";

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    values: ExpenseFormValues;
  } | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const { data, isLoading, error } = api.expense.list.useQuery({ take: 50 });
  const utils = api.useUtils();

  const del = api.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.dashboard.summary.invalidate();
    },
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">All spending, newest first.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add expense</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState text="No expenses yet. Add your first one." />
      ) : (
        <ul className="space-y-2">
          {items.map((expense) => (
            <li
              key={expense.id}
              className="motion-card flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium tabular-nums">{expense.amount.toFixed(2)}</p>
                <p className="text-sm text-[var(--muted)]">
                  {expense.category.name} · {new Date(expense.date).toLocaleDateString()}
                  {expense.note ? ` · ${expense.note}` : ""}
                </p>
                {expense.splits.length > 0 && (
                  <p className="mt-1 text-xs text-accent">Split across {expense.splits.length} people</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm text-accent hover:underline"
                  onClick={() =>
                    setEditingExpense({
                      id: expense.id,
                      values: {
                        amount: String(expense.amount),
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
                  onClick={() => setExpenseToDelete(expense.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New expense">
        <ExpenseForm onSuccess={() => setOpen(false)} />
      </Modal>

      <Modal
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit expense"
      >
        {editingExpense && (
          <ExpenseForm
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
