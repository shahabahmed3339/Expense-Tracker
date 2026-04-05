"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { ExpenseForm } from "./components/ExpenseForm";

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
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
          <p className="text-sm text-[var(--muted)] mt-1">All spending, newest first.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add expense</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState text="No expenses yet. Add your first one." />
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium tabular-nums">{e.amount.toFixed(2)}</p>
                <p className="text-sm text-[var(--muted)]">
                  {e.category.name} · {new Date(e.date).toLocaleDateString()}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
                {e.splits.length > 0 && (
                  <p className="text-xs text-accent mt-1">
                    Split across {e.splits.length} people
                  </p>
                )}
              </div>
              <button
                type="button"
                className="text-sm text-red-400 hover:underline"
                onClick={() => {
                  if (confirm("Delete this expense?")) del.mutate(e.id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New expense">
        <ExpenseForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
