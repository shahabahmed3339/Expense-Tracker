"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { equalSplitParts, sumFloats } from "@/lib/calculations/split";
import { groupBy } from "@/lib/collections/grouping";
import { formatAmount, parseAmountInput } from "@/lib/formatting/currency";
import { formatShortDate } from "@/lib/formatting/date";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InlineCreatePerson } from "@/components/dependencies/InlineCreatePerson";
import { AmountText } from "@/components/ui/AmountText";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

const LazyExpenseForm = dynamic(
  () => import("../expenses/components/ExpenseForm").then((mod) => mod.ExpenseForm),
  {
    ssr: false,
    loading: () => <div className="flex min-h-40 items-center justify-center"><Loader /></div>,
  },
);

const SELF_KEY = "__self__";

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-6v6m-9 3h10a1 1 0 0 0 1-1V7H6v12a1 1 0 0 0 1 1Z"
      />
    </svg>
  );
}

type PaidMap = Record<string, boolean>;
type SelectedMap = Record<string, boolean>;
type AmountMap = Record<string, string>;

export default function SplitsPage() {
  const [expenseId, setExpenseId] = useState("");
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [selectedPeople, setSelectedPeople] = useState<SelectedMap>({ [SELF_KEY]: true });
  const [customAmounts, setCustomAmounts] = useState<AmountMap>({});
  const [paidStates, setPaidStates] = useState<PaidMap>({});
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState("");
  const [viewExpenseId, setViewExpenseId] = useState("");
  const [personToAdd, setPersonToAdd] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid" | "mixed">("all");
  const [groupByCategory, setGroupByCategory] = useState(true);

  const utils = api.useUtils();
  const { data: listData, isLoading, error } = api.expense.list.useQuery({ take: 100 });
  const { data: people } = api.person.list.useQuery();

  const setSplits = api.split.setExpenseSplits.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.dashboard.summary.invalidate();
      toast.success("Splits updated");
      resetEditor();
      setDeleteExpenseId("");
      setSplitEditorOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const expenses = listData?.items ?? [];
  const expense = useMemo(() => expenses.find((entry) => entry.id === expenseId), [expenses, expenseId]);
  const expensesWithSplits = useMemo(() => expenses.filter((entry) => entry.splits.length > 0), [expenses]);
  const filteredExpensesWithSplits = useMemo(() => {
    return expensesWithSplits.filter((entry) => {
      const matchesSearch =
        search.trim().length === 0 ||
        [entry.category.name, entry.note ?? "", formatShortDate(entry.date)]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || entry.categoryId === categoryFilter;
      const paidCount = entry.splits.filter((split) => split.isPaid).length;
      const unpaidCount = entry.splits.filter((split) => !split.isSelf && !split.isPaid).length;
      const matchesPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" ? unpaidCount === 0 && paidCount > 0 : false) ||
        (paymentFilter === "unpaid" ? paidCount === 0 && unpaidCount > 0 : false) ||
        (paymentFilter === "mixed" ? paidCount > 0 && unpaidCount > 0 : false);

      return matchesSearch && matchesCategory && matchesPayment;
    });
  }, [categoryFilter, expensesWithSplits, paymentFilter, search]);
  const groupedExpensesWithSplits = useMemo(
    () => groupBy(filteredExpensesWithSplits, (entry) => entry.category.name),
    [filteredExpensesWithSplits],
  );
  const viewedExpense = useMemo(() => expenses.find((entry) => entry.id === viewExpenseId) ?? null, [expenses, viewExpenseId]);
  const { data: categories } = api.category.list.useQuery();

  const participants = useMemo(
    () => [
      { key: SELF_KEY, label: "Me", isSelf: true, personId: null as string | null },
      ...(people?.map((person) => ({
        key: person.id,
        label: person.name,
        isSelf: false,
        personId: person.id,
      })) ?? []),
    ],
    [people],
  );

  const hasOtherPeople = (people?.length ?? 0) > 0;
  const activeParticipantKeys = useMemo(
    () =>
      participants
        .filter((participant) => participant.isSelf || selectedPeople[participant.key] || !!customAmounts[participant.key])
        .map((participant) => participant.key),
    [customAmounts, participants, selectedPeople],
  );
  const addablePeople = useMemo(
    () => participants.filter((participant) => !participant.isSelf && !activeParticipantKeys.includes(participant.key)),
    [activeParticipantKeys, participants],
  );

  function resetEditor() {
    setExpenseId("");
    setSelectedPeople({ [SELF_KEY]: true });
    setCustomAmounts({});
    setPaidStates({});
    setMode("equal");
    setPersonToAdd("");
  }

  const openCreateModal = () => {
    resetEditor();
    setSplitEditorOpen(true);
  };

  const toggleParticipant = (key: string) => {
    if (key === SELF_KEY) return;
    setSelectedPeople((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addParticipant = (key: string) => {
    if (!key || key === SELF_KEY) return;
    setSelectedPeople((prev) => ({ ...prev, [key]: true }));
    setCustomAmounts((prev) => ({ ...prev, [key]: prev[key] ?? "" }));
    setPaidStates((prev) => ({ ...prev, [key]: prev[key] ?? false }));
    setPersonToAdd("");
  };

  const removeParticipant = (key: string) => {
    if (key === SELF_KEY) return;
    setSelectedPeople((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCustomAmounts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPaidStates((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const togglePaid = (key: string) => {
    setPaidStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadSavedSplitSetup = (targetExpenseId: string) => {
    const targetExpense = expenses.find((entry) => entry.id === targetExpenseId);
    if (!targetExpense) return;

    const nextSelected: SelectedMap = { [SELF_KEY]: false };
    const nextAmounts: AmountMap = {};
    const nextPaid: PaidMap = {};

    targetExpense.splits.forEach((split) => {
      const key = split.isSelf ? SELF_KEY : split.personId ?? split.id;
      nextSelected[key] = true;
      nextAmounts[key] = formatAmount(split.amount);
      nextPaid[key] = split.isPaid;
    });

    nextSelected[SELF_KEY] = true;
    setExpenseId(targetExpenseId);
    setSelectedPeople(nextSelected);
    setCustomAmounts(nextAmounts);
    setPaidStates(nextPaid);
    setMode("custom");
    setPersonToAdd("");
    setSplitEditorOpen(true);
  };

  const applyEqual = () => {
    if (!expense) return;

    const chosen = participants.filter((participant) => selectedPeople[participant.key]);
    if (!chosen.length) {
      toast.error("Select at least one participant");
      return;
    }

    const parts = equalSplitParts(expense.amount, chosen.length);
    const nextAmounts: AmountMap = {};
    chosen.forEach((participant, index) => {
      nextAmounts[participant.key] = formatAmount(parts[index]);
    });
    setCustomAmounts(nextAmounts);
    setMode("custom");
  };

  const submitSplits = () => {
    if (!expenseId || !expense) return;

    const chosen = participants.filter((participant) => {
      if (mode === "equal") return selectedPeople[participant.key];
      return !!customAmounts[participant.key];
    });

    if (!chosen.some((participant) => participant.isSelf)) {
      toast.error("Include yourself in the split to reflect your share honestly");
      return;
    }

    const splits =
      mode === "equal"
        ? equalSplitParts(expense.amount, chosen.length).map((amount, index) => {
            const participant = chosen[index];
            return {
              personId: participant.personId,
              name: participant.label,
              amount,
              isSelf: participant.isSelf,
              isPaid: participant.isSelf ? false : !!paidStates[participant.key],
            };
          })
        : chosen
            .map((participant) => ({
              personId: participant.personId,
              name: participant.label,
              amount: parseAmountInput(customAmounts[participant.key]),
              isSelf: participant.isSelf,
              isPaid: participant.isSelf ? false : !!paidStates[participant.key],
            }))
            .filter((split) => !Number.isNaN(split.amount) && split.amount > 0);

    if (!splits.length) {
      toast.error("Enter at least one positive amount");
      return;
    }

    const sum = sumFloats(splits.map((split) => split.amount));
    if (Math.abs(sum - expense.amount) > 0.02) {
      toast.error(`Splits must sum to ${formatAmount(expense.amount)} (currently ${formatAmount(sum)})`);
      return;
    }

    setSplits.mutate({ expenseId, splits });
  };

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Splits</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Include yourself in the split, and mark other people as paid when they have already settled their share. Lists are ordered by most recently updated.
          </p>
        </div>
        {!!expenses.length && <Button onClick={openCreateModal}>Add split</Button>}
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
        <FilterField label="Payment status">
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="paid">All paid</option>
            <option value="unpaid">All unpaid</option>
            <option value="mixed">Mixed</option>
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

      {!expenses.length ? (
        <div className="space-y-3">
          <EmptyState text="Create an expense first, then assign splits here." />
          <Button onClick={() => setExpenseOpen(true)}>Add expense</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExpensesWithSplits.length === 0 ? (
            <EmptyState text="No saved splits match the current filters." />
          ) : groupByCategory ? (
            Object.entries(groupedExpensesWithSplits).map(([categoryName, entries]) => (
              <section
                key={categoryName}
                className="motion-card space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div>
                  <h2 className="text-sm font-medium">{categoryName}</h2>
                  <p className="text-xs text-[var(--muted)]">Every saved split in this category.</p>
                </div>
                <SplitTable
                  entries={entries}
                  onView={setViewExpenseId}
                  onEdit={loadSavedSplitSetup}
                  onDelete={(nextExpenseId) => {
                    setDeleteExpenseId(nextExpenseId);
                    setDeleteOpen(true);
                  }}
                />
              </section>
            ))
          ) : (
            <div className="motion-card space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <h2 className="text-sm font-medium">All saved splits</h2>
                <p className="text-xs text-[var(--muted)]">Every expense with a saved split setup is listed here.</p>
              </div>
              <SplitTable
                entries={filteredExpensesWithSplits}
                onView={setViewExpenseId}
                onEdit={loadSavedSplitSetup}
                onDelete={(nextExpenseId) => {
                  setDeleteExpenseId(nextExpenseId);
                  setDeleteOpen(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      <Modal open={splitEditorOpen} onClose={() => setSplitEditorOpen(false)} title={expense ? "Edit split" : "New split"}>
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs text-[var(--muted)]">Expense</label>
              <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={() => setExpenseOpen(true)}>
                Add expense
              </button>
            </div>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={expenseId}
              onChange={(event) => {
                setExpenseId(event.target.value);
                setSelectedPeople({ [SELF_KEY]: true });
                setCustomAmounts({});
                setPaidStates({});
                setMode("equal");
                setPersonToAdd("");
              }}
            >
              <option value="">Select expense...</option>
              {expenses.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {formatAmount(entry.amount)} - {entry.category.name} - {formatShortDate(entry.date)}
                </option>
              ))}
            </select>
          </div>

          {expense ? (
            <>
              <p className="text-sm">
                Total bill: <span className="tabular-nums font-semibold"><AmountText value={expense.amount} /></span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm sm:py-1 ${mode === "equal" ? "bg-accent text-white" : "border border-[var(--border)] bg-[var(--nav-hover)]"}`}
                  onClick={() => setMode("equal")}
                  aria-label="Use equal split mode"
                  title="Equal split"
                >
                  Equal split
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm sm:py-1 ${mode === "custom" ? "bg-accent text-white" : "border border-[var(--border)] bg-[var(--nav-hover)]"}`}
                  onClick={() => setMode("custom")}
                  aria-label="Use custom split mode"
                  title="Custom split"
                >
                  Custom split
                </button>
              </div>

              {mode === "equal" && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--muted)]">Choose participants for an equal split.</p>
                  {!hasOtherPeople ? (
                    <div className="space-y-3">
                      <EmptyState text="Add people before splitting this expense." />
                      <InlineCreatePerson />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          value={personToAdd}
                          onChange={(event) => setPersonToAdd(event.target.value)}
                        >
                          <option value="">Select person to add...</option>
                          {addablePeople.map((participant) => (
                            <option key={participant.key} value={participant.key}>
                              {participant.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => addParticipant(personToAdd)}
                          disabled={!personToAdd}
                          aria-label="Add selected person"
                          title="Add selected person"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {participants
                          .filter((participant) => participant.isSelf || selectedPeople[participant.key])
                          .map((participant) => {
                          const checked = participant.isSelf ? true : !!selectedPeople[participant.key];
                          return (
                            <li key={participant.key} className="rounded-md border border-[var(--border)]/80 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={participant.isSelf}
                                    onChange={() => toggleParticipant(participant.key)}
                                  />
                                  <span>{participant.label}</span>
                                </label>
                                <div className="flex items-center gap-3">
                                  {!participant.isSelf && checked && (
                                    <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                                      <input
                                        type="checkbox"
                                        checked={!!paidStates[participant.key]}
                                        onChange={() => togglePaid(participant.key)}
                                      />
                                      Paid
                                    </label>
                                  )}
                                  {!participant.isSelf && (
                                    <button
                                      type="button"
                                      aria-label={`Remove ${participant.label}`}
                                      title={`Remove ${participant.label}`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10"
                                      onClick={() => removeParticipant(participant.key)}
                                    >
                                      <TrashIcon />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <InlineCreatePerson />
                      <Button onClick={applyEqual}>Preview equal amounts</Button>
                    </>
                  )}
                </div>
              )}

              {mode === "custom" && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--muted)]">Set each participant's share. Mark paid for people who already settled.</p>
                  {!hasOtherPeople ? (
                    <div className="space-y-3">
                      <EmptyState text="Add people before entering custom split amounts." />
                      <InlineCreatePerson />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          value={personToAdd}
                          onChange={(event) => setPersonToAdd(event.target.value)}
                        >
                          <option value="">Select person to add...</option>
                          {addablePeople.map((participant) => (
                            <option key={participant.key} value={participant.key}>
                              {participant.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => addParticipant(personToAdd)}
                          disabled={!personToAdd}
                          aria-label="Add selected person"
                          title="Add selected person"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      {participants
                        .filter((participant) => participant.isSelf || !!customAmounts[participant.key] || selectedPeople[participant.key])
                        .map((participant) => (
                        <div key={participant.key} className="rounded-md border border-[var(--border)]/80 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="min-w-24 flex-1 text-sm">{participant.label}</span>
                            <MoneyInput
                              className="w-28 px-2 py-1"
                              value={customAmounts[participant.key] ?? ""}
                              onChange={(event) =>
                                setCustomAmounts((prev) => ({ ...prev, [participant.key]: event }))
                              }
                            />
                            {participant.isSelf ? (
                              <span className="text-xs text-[var(--muted)]">Your share</span>
                            ) : (
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                                  <input
                                    type="checkbox"
                                    checked={!!paidStates[participant.key]}
                                    onChange={() => togglePaid(participant.key)}
                                  />
                                  Paid
                                </label>
                                <button
                                  type="button"
                                  aria-label={`Remove ${participant.label}`}
                                  title={`Remove ${participant.label}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10"
                                  onClick={() => removeParticipant(participant.key)}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <InlineCreatePerson />
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={setSplits.isPending || !expenseId}
                onClick={submitSplits}
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                aria-label={setSplits.isPending ? "Saving split setup" : "Save split setup"}
                title={setSplits.isPending ? "Saving..." : "Save split setup"}
              >
                {setSplits.isPending ? "Saving..." : "Save split setup"}
              </button>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Select an expense above to create or update its split setup.</p>
          )}
        </div>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="New expense">
        <LazyExpenseForm
          onSuccess={() => setExpenseOpen(false)}
          onCreated={(nextExpenseId) => {
            setExpenseId(nextExpenseId);
            setSplitEditorOpen(true);
            setMode("equal");
            setSelectedPeople({ [SELF_KEY]: true });
            setCustomAmounts({});
            setPaidStates({});
          }}
        />
      </Modal>

      <Modal
        open={!!viewedExpense}
        onClose={() => setViewExpenseId("")}
        title="Split participants"
      >
        {viewedExpense && (
          <div className="space-y-4">
            <div className="text-sm text-[var(--muted)]">
              <p>
                Expense: <span className="text-[var(--fg)] tabular-nums"><AmountText value={viewedExpense.amount} /></span>
              </p>
              <p>
                Category: <span className="text-[var(--fg)]">{viewedExpense.category.name}</span>
              </p>
              <p>
                Date: <span className="text-[var(--fg)]">{formatShortDate(viewedExpense.date)}</span>
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)]">
              <table className="responsive-table w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-[var(--muted)]">
                    <th className="px-3 py-2 font-medium">Participant</th>
                    <th className="px-3 py-2 font-medium">Share</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {viewedExpense.splits.map((split) => (
                    <tr key={split.id} className="motion-row border-t border-[var(--border)]">
                      <td className="px-3 py-2" data-label="Participant">
                        {split.isSelf ? "Me" : split.person?.name ?? split.name}
                      </td>
                      <td className="px-3 py-2 tabular-nums" data-label="Share">
                        <AmountText value={split.amount} />
                      </td>
                      <td className="px-3 py-2" data-label="Status">
                        {split.isSelf ? "Your share" : split.isPaid ? "Paid" : "Unpaid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteExpenseId("");
        }}
        title="Delete saved splits"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">This will remove the saved split setup for the selected expense.</p>
          <button
            type="button"
            disabled={setSplits.isPending || !deleteExpenseId}
            className="w-full rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            aria-label={setSplits.isPending ? "Deleting saved splits" : "Delete saved splits"}
            title={setSplits.isPending ? "Deleting..." : "Delete saved splits"}
            onClick={() => {
              if (!deleteExpenseId) return;
              setSplits.mutate({ expenseId: deleteExpenseId, splits: [] });
              setDeleteOpen(false);
            }}
          >
            {setSplits.isPending ? "Deleting..." : "Delete saved splits"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SplitTable({
  entries,
  onView,
  onEdit,
  onDelete,
}: {
  entries: {
    id: string;
    amount: number;
    date: Date;
    updatedAt: Date;
    category: { name: string };
    splits: { id: string; amount: number; isPaid: boolean; isSelf: boolean }[];
  }[];
  onView: (expenseId: string) => void;
  onEdit: (expenseId: string) => void;
  onDelete: (expenseId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="responsive-table w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-[var(--muted)]">
            <th className="px-3 py-2 font-medium whitespace-nowrap">Expense</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Category</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Date</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Participants</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Paid status</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Updated</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const paidCount = entry.splits.filter((split) => split.isPaid).length;
            const unpaidCount = entry.splits.filter((split) => !split.isSelf && !split.isPaid).length;
            const paymentStatus =
              unpaidCount === 0 && paidCount > 0 ? "Paid" : paidCount === 0 ? "Unpaid" : "Mixed";

            return (
              <tr key={entry.id} className="motion-row border-t border-[var(--border)] align-top">
                <td className="px-3 py-2 tabular-nums" data-label="Expense"><AmountText value={entry.amount} /></td>
                <td className="px-3 py-2 break-words" data-label="Category">{entry.category.name}</td>
                <td className="px-3 py-2" data-label="Date">{formatShortDate(entry.date)}</td>
                <td className="px-3 py-2" data-label="Participants">{entry.splits.length}</td>
                <td className="px-3 py-2" data-label="Paid status">{paymentStatus}</td>
                <td className="px-3 py-2 text-[var(--muted)]" data-label="Updated">{formatShortDate(entry.updatedAt)}</td>
                <td className="px-3 py-2" data-label="Actions" data-actions-cell="true">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm text-[var(--muted)] hover:underline"
                      aria-label={`View split participants for ${entry.category.name}`}
                      title="View split participants"
                      onClick={() => onView(entry.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline"
                      aria-label={`Edit split for ${entry.category.name}`}
                      title="Edit split"
                      onClick={() => onEdit(entry.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-400 hover:underline"
                      aria-label={`Delete split for ${entry.category.name}`}
                      title="Delete split"
                      onClick={() => onDelete(entry.id)}
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
  );
}
