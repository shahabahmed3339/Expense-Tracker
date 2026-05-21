"use client";

import { useMemo, useState } from "react";
import { LoanType } from "@prisma/client";
import { LOAN_TYPE_DESCRIPTIONS, LOAN_TYPE_LABELS } from "@/lib/constants/domain";
import { COMMON_UI } from "@/lib/constants/ui";
import { api } from "@/lib/trpc";
import { formatShortDate } from "@/lib/formatting/date";
import { formatAmount, parseAmountInput } from "@/lib/formatting/currency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineCreatePerson } from "@/components/dependencies/InlineCreatePerson";
import { AmountText } from "@/components/ui/AmountText";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

type LoanEditorState = {
  id: string;
  personId: string;
  type: LoanType;
  total: string;
};

type PaymentEditorState = {
  loanId: string;
  transactionId?: string;
  amount: string;
  date: string;
  note: string;
};

export default function LoansPage() {
  const [open, setOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanEditorState | null>(null);
  const [paymentEditor, setPaymentEditor] = useState<PaymentEditorState | null>(null);
  const [personId, setPersonId] = useState("");
  const [type, setType] = useState<LoanType>(LoanType.RECEIVABLE);
  const [total, setTotal] = useState("");
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LoanType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "settled">("open");

  const utils = api.useUtils();
  const { data: loans, isLoading, error } = api.loan.list.useQuery();
  const { data: people } = api.person.list.useQuery();

  const create = api.loan.create.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Loan created");
      setOpen(false);
      setPersonId("");
      setTotal("");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const update = api.loan.update.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Loan updated");
      setEditingLoan(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const addTransaction = api.loan.addTransaction.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Payment recorded");
      setPaymentEditor(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const updateTransaction = api.loan.updateTransaction.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Payment updated");
      setPaymentEditor(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const deleteTransaction = api.loan.deleteTransaction.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Payment deleted");
      setPaymentToDelete(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const del = api.loan.delete.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
    },
  });

  const filteredLoans = useMemo(() => {
    return (loans ?? []).filter((loan) => {
      const paid = loan.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const remaining = Math.max(loan.totalAmount - paid, 0);
      const matchesSearch =
        search.trim().length === 0 ||
        [loan.person.name, loan.type, loan.transactions.map((tx) => tx.note ?? "").join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesPerson = personFilter === "all" || loan.personId === personFilter;
      const matchesType = typeFilter === "all" || loan.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" ? remaining > 0 : remaining === 0);

      return matchesSearch && matchesPerson && matchesType && matchesStatus;
    });
  }, [loans, personFilter, search, statusFilter, typeFilter]);

  const loansById = useMemo(
    () => new Map((loans ?? []).map((loan) => [loan.id, loan])),
    [loans],
  );

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Receivables and payables by person, ordered by most recently updated.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New loan</Button>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Person, type, note"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Person">
          <select
            value={personFilter}
            onChange={(event) => setPersonFilter(event.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All people</option>
            {people?.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Type">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value={LoanType.RECEIVABLE}>{LOAN_TYPE_LABELS[LoanType.RECEIVABLE]}</option>
            <option value={LoanType.PAYABLE}>{LOAN_TYPE_LABELS[LoanType.PAYABLE]}</option>
          </select>
        </FilterField>
        <FilterField label="Status">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="settled">Settled</option>
          </select>
        </FilterField>
      </FilterBar>

      {!filteredLoans.length ? (
        <EmptyState text="No loans match the current filters." />
      ) : (
        <ul className="space-y-4">
          {filteredLoans.map((loan) => {
            const paid = loan.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            const remaining = Math.max(loan.totalAmount - paid, 0);

            return (
              <li key={loan.id} className="motion-card space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{loan.person.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {loan.type === LoanType.RECEIVABLE ? "They owe you" : "You owe them"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">Total: <AmountText value={loan.totalAmount} /></p>
                    <p className="tabular-nums">Paid: <AmountText value={paid} /></p>
                    <p className="tabular-nums font-medium">
                      Remaining:{" "}
                      <AmountText
                        value={remaining}
                        className={remaining > 0 ? "text-amber-400" : "text-emerald-400"}
                      />
                    </p>
                  </div>
                </div>

                {loan.transactions.length > 0 && (
                  <div className="space-y-2 border-t border-[var(--border)] pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Payments</p>
                    <ul className="space-y-2 text-sm">
                      {loan.transactions.map((transaction) => (
                        <li
                          key={transaction.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)]/80 px-3 py-2"
                        >
                          <div>
                            <span className="text-[var(--muted)]">{formatShortDate(transaction.date)}</span>
                            {transaction.note ? <span className="text-xs text-[var(--muted)]"> - {transaction.note}</span> : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="tabular-nums font-medium">
                              <AmountText value={transaction.amount} />
                            </span>
                            <button
                              type="button"
                              className="text-sm text-accent hover:underline"
                              onClick={() =>
                                setPaymentEditor({
                                  loanId: loan.id,
                                  transactionId: transaction.id,
                                  amount: formatAmount(transaction.amount),
                                  date: new Date(transaction.date).toISOString().slice(0, 10),
                                  note: transaction.note ?? "",
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-sm text-red-400 hover:underline"
                              onClick={() => setPaymentToDelete(transaction.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {remaining > 0 && (
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline"
                      aria-label={`Add payment for ${loan.person.name}`}
                      title="Add payment"
                      onClick={() =>
                        setPaymentEditor({
                          loanId: loan.id,
                          amount: "",
                          date: new Date().toISOString().slice(0, 10),
                          note: "",
                        })
                      }
                    >
                      Add payment
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-sm text-accent hover:underline"
                    aria-label={`Edit loan for ${loan.person.name}`}
                    title="Edit loan"
                    onClick={() =>
                      setEditingLoan({
                        id: loan.id,
                        personId: loan.personId,
                        type: loan.type,
                        total: formatAmount(loan.totalAmount),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-400 transition-colors hover:underline"
                    aria-label={`Delete loan for ${loan.person.name}`}
                    title="Delete loan"
                    onClick={() => setLoanToDelete(loan.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New loan">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const nextTotal = parseAmountInput(total);
            if (Number.isNaN(nextTotal) || nextTotal <= 0) {
              toast.error("Enter a valid total");
              return;
            }
            if (!personId) {
              toast.error("Pick a person");
              return;
            }
            create.mutate({ personId, type, totalAmount: nextTotal });
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Person</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
              required
            >
              <option value="">{COMMON_UI.selectPlaceholder}</option>
              {people?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <InlineCreatePerson onCreated={(nextPersonId) => setPersonId(nextPersonId)} />
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Type</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value as LoanType)}
            >
              <option value={LoanType.RECEIVABLE}>{LOAN_TYPE_DESCRIPTIONS[LoanType.RECEIVABLE]}</option>
              <option value={LoanType.PAYABLE}>{LOAN_TYPE_DESCRIPTIONS[LoanType.PAYABLE]}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Total amount</label>
            <MoneyInput value={total} onChange={setTotal} required />
          </div>
          <button type="submit" disabled={create.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50" aria-label={create.isPending ? "Saving loan" : "Create loan"} title={create.isPending ? COMMON_UI.saving : "Create"}>
            {create.isPending ? COMMON_UI.saving : "Create"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editingLoan} onClose={() => setEditingLoan(null)} title="Edit loan">
        {editingLoan && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextTotal = parseAmountInput(editingLoan.total);
              if (Number.isNaN(nextTotal) || nextTotal <= 0) {
                toast.error("Enter a valid total");
                return;
              }
              update.mutate({
                id: editingLoan.id,
                personId: editingLoan.personId,
                type: editingLoan.type,
                totalAmount: nextTotal,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Person</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingLoan.personId}
                onChange={(event) =>
                  setEditingLoan((current) => (current ? { ...current, personId: event.target.value } : current))
                }
                required
              >
                <option value="">{COMMON_UI.selectPlaceholder}</option>
                {people?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <InlineCreatePerson
              onCreated={(nextPersonId) =>
                setEditingLoan((current) => (current ? { ...current, personId: nextPersonId } : current))
              }
            />
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Type</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingLoan.type}
                onChange={(event) =>
                  setEditingLoan((current) =>
                    current ? { ...current, type: event.target.value as LoanType } : current,
                  )
                }
              >
                <option value={LoanType.RECEIVABLE}>{LOAN_TYPE_DESCRIPTIONS[LoanType.RECEIVABLE]}</option>
                <option value={LoanType.PAYABLE}>{LOAN_TYPE_DESCRIPTIONS[LoanType.PAYABLE]}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Total amount</label>
              <MoneyInput
                value={editingLoan.total}
                onChange={(value) =>
                  setEditingLoan((current) => (current ? { ...current, total: value } : current))
                }
                required
              />
            </div>
            <button type="submit" disabled={update.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50" aria-label={update.isPending ? "Saving loan changes" : "Save loan changes"} title={update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}>
              {update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        open={!!paymentEditor}
        onClose={() => setPaymentEditor(null)}
        title={paymentEditor?.transactionId ? "Edit payment" : "Record payment"}
      >
        {paymentEditor && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextAmount = parseAmountInput(paymentEditor.amount);
              if (Number.isNaN(nextAmount) || nextAmount <= 0) {
                toast.error("Enter a valid amount");
                return;
              }

              const loan = loansById.get(paymentEditor.loanId);
              if (!loan) {
                toast.error("Loan not found");
                return;
              }

              const paidExcludingCurrent = loan.transactions
                .filter((transaction) => transaction.id !== paymentEditor.transactionId)
                .reduce((sum, transaction) => sum + transaction.amount, 0);
              const remaining = Math.max(loan.totalAmount - paidExcludingCurrent, 0);

              if (nextAmount - remaining > 0.01) {
                toast.error(`Payment cannot exceed the remaining amount of ${remaining.toFixed(2)}`);
                return;
              }

              if (paymentEditor.transactionId) {
                updateTransaction.mutate({
                  id: paymentEditor.transactionId,
                  amount: nextAmount,
                  date: new Date(paymentEditor.date),
                  note: paymentEditor.note || null,
                });
                return;
              }

              addTransaction.mutate({
                loanId: paymentEditor.loanId,
                amount: nextAmount,
                date: new Date(paymentEditor.date),
                note: paymentEditor.note || null,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
              <MoneyInput
                value={paymentEditor.amount}
                onChange={(value) =>
                  setPaymentEditor((current) => (current ? { ...current, amount: value } : current))
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={paymentEditor.date}
                onChange={(event) =>
                  setPaymentEditor((current) => (current ? { ...current, date: event.target.value } : current))
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Note</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={paymentEditor.note}
                onChange={(event) =>
                  setPaymentEditor((current) => (current ? { ...current, note: event.target.value } : current))
                }
              />
            </div>
            <button type="submit" disabled={addTransaction.isPending || updateTransaction.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50" aria-label={paymentEditor.transactionId ? "Save payment changes" : "Save payment"} title={paymentEditor.transactionId ? COMMON_UI.saveChanges : "Save payment"}>
              {addTransaction.isPending || updateTransaction.isPending ? COMMON_UI.saving : paymentEditor.transactionId ? COMMON_UI.saveChanges : "Save payment"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!loanToDelete}
        title="Delete loan?"
        description="This will permanently remove the loan and all of its recorded payments."
        confirmText="Delete loan"
        tone="danger"
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => {
          if (!loanToDelete) return;
          del.mutate(loanToDelete);
          setLoanToDelete(null);
        }}
      />

      <ConfirmDialog
        open={!!paymentToDelete}
        title="Delete payment?"
        description="This will permanently remove the selected loan payment."
        confirmText="Delete payment"
        tone="danger"
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (!paymentToDelete) return;
          deleteTransaction.mutate(paymentToDelete);
        }}
      />
    </div>
  );
}
