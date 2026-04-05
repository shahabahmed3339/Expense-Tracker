"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { equalSplitParts, sumFloats } from "@/lib/calculations/split";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function SplitsPage() {
  const [expenseId, setExpenseId] = useState("");
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [selectedPeople, setSelectedPeople] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const utils = api.useUtils();
  const { data: listData, isLoading, error } = api.expense.list.useQuery({ take: 100 });
  const { data: people } = api.person.list.useQuery();

  const setSplits = api.split.setExpenseSplits.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      toast.success("Splits updated");
      setExpenseId("");
      setSelectedPeople({});
      setCustomAmounts({});
    },
    onError: (e) => toast.error(e.message),
  });

  const expenses = listData?.items ?? [];

  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenses, expenseId],
  );

  const togglePerson = (id: string) => {
    setSelectedPeople((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyEqual = () => {
    if (!expense || !people?.length) return;
    const ids = people.filter((p) => selectedPeople[p.id]).map((p) => p.id);
    if (!ids.length) {
      toast.error("Select at least one person");
      return;
    }
    const parts = equalSplitParts(expense.amount, ids.length);
    const next: Record<string, string> = {};
    ids.forEach((id, i) => {
      next[id] = String(parts[i]);
    });
    setCustomAmounts(next);
    setMode("custom");
  };

  const submitCustom = () => {
    if (!expenseId || !expense) return;
    const ids =
      mode === "equal"
        ? people?.filter((p) => selectedPeople[p.id]).map((p) => p.id) ?? []
        : Object.keys(customAmounts).filter((id) => customAmounts[id]);

    let splits: { personId: string; amount: number }[];

    if (mode === "equal") {
      if (!ids.length) {
        toast.error("Select people for equal split");
        return;
      }
      const parts = equalSplitParts(expense.amount, ids.length);
      splits = ids.map((id, i) => ({ personId: id, amount: parts[i] }));
    } else {
      splits = Object.entries(customAmounts)
        .map(([personId, raw]) => {
          const amount = parseFloat(raw);
          return { personId, amount };
        })
        .filter((s) => !Number.isNaN(s.amount) && s.amount > 0);

      if (!splits.length) {
        toast.error("Enter at least one positive amount");
        return;
      }
    }

    const sum = sumFloats(splits.map((s) => s.amount));
    if (Math.abs(sum - expense.amount) > 0.02) {
      toast.error(`Splits must sum to ${expense.amount.toFixed(2)} (currently ${sum.toFixed(2)})`);
      return;
    }

    setSplits.mutate({ expenseId, splits });
  };

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Splits</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Allocate an existing expense across people. Totals must match the expense amount.
        </p>
      </div>

      {!expenses.length ? (
        <EmptyState text="Create an expense first, then assign splits here." />
      ) : (
        <>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Expense</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={expenseId}
              onChange={(e) => setExpenseId(e.target.value)}
            >
              <option value="">Select expense…</option>
              {expenses.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.amount.toFixed(2)} — {e.category.name} —{" "}
                  {new Date(e.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {expense && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
              <p className="text-sm">
                Amount: <span className="font-semibold tabular-nums">{expense.amount.toFixed(2)}</span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`text-sm px-3 py-2 rounded-md sm:py-1 ${
                    mode === "equal" ? "bg-accent text-white" : "border border-[var(--border)] bg-[var(--nav-hover)]"
                  }`}
                  onClick={() => setMode("equal")}
                >
                  Equal split
                </button>
                <button
                  type="button"
                  className={`text-sm px-3 py-2 rounded-md sm:py-1 ${
                    mode === "custom" ? "bg-accent text-white" : "border border-[var(--border)] bg-[var(--nav-hover)]"
                  }`}
                  onClick={() => setMode("custom")}
                >
                  Custom amounts
                </button>
              </div>

              {mode === "equal" && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--muted)]">Select participants</p>
                  {!people?.length ? (
                    <EmptyState text="Add people under Groups first." />
                  ) : (
                    <ul className="space-y-1">
                      {people.map((p) => (
                        <li key={p.id}>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedPeople[p.id]}
                              onChange={() => togglePerson(p.id)}
                            />
                            {p.name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button onClick={applyEqual}>Preview equal amounts</Button>
                </div>
              )}

              {mode === "custom" && people && (
                <div className="space-y-2">
                  {people.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="w-28 truncate text-sm">{p.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
                        value={customAmounts[p.id] ?? ""}
                        onChange={(e) =>
                          setCustomAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={setSplits.isPending || !expenseId}
                onClick={submitCustom}
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {setSplits.isPending ? "Saving…" : "Save splits"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
