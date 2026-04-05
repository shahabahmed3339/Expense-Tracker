"use client";

import { useState } from "react";
import { LoanType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineCreatePerson } from "@/components/dependencies/InlineCreatePerson";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function LoansPage() {
  const [open, setOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<{
    id: string;
    personId: string;
    type: LoanType;
    total: string;
  } | null>(null);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");
  const [type, setType] = useState<LoanType>(LoanType.RECEIVABLE);
  const [total, setTotal] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);

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
    onError: (error) => toast.error(error.message),
  });

  const update = api.loan.update.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Loan updated");
      setEditingLoan(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const addTx = api.loan.addTransaction.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Payment recorded");
      setPayOpen(null);
      setPayAmount("");
      setPayNote("");
    },
    onError: (error) => toast.error(error.message),
  });

  const del = api.loan.delete.useMutation({
    onSuccess: () => utils.loan.list.invalidate(),
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Receivables and payables by person.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New loan</Button>
      </div>

      {!loans?.length ? (
        <EmptyState text="No loans yet." />
      ) : (
        <ul className="space-y-4">
          {loans.map((loan) => {
            const paid = loan.transactions.reduce((sum, tx) => sum + tx.amount, 0);
            const remaining = loan.totalAmount - paid;
            return (
              <li key={loan.id} className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{loan.person.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {loan.type === LoanType.RECEIVABLE ? "They owe you" : "You owe them"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">Total: {loan.totalAmount.toFixed(2)}</p>
                    <p className="tabular-nums text-[var(--muted)]">Paid: {paid.toFixed(2)}</p>
                    <p className={`tabular-nums font-medium ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      Remaining: {remaining.toFixed(2)}
                    </p>
                  </div>
                </div>
                {loan.transactions.length > 0 && (
                  <ul className="space-y-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
                    {loan.transactions.slice(0, 5).map((tx) => (
                      <li key={tx.id} className="flex justify-between">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span className="tabular-nums">{tx.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" className="text-sm text-accent hover:underline" onClick={() => setPayOpen(loan.id)}>
                    Add payment
                  </button>
                  <button
                    type="button"
                    className="text-sm text-accent hover:underline"
                    onClick={() =>
                      setEditingLoan({
                        id: loan.id,
                        personId: loan.personId,
                        type: loan.type,
                        total: String(loan.totalAmount),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-400 transition-colors hover:underline"
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
            const nextTotal = parseFloat(total);
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
              <option value="">Select...</option>
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
              <option value={LoanType.RECEIVABLE}>Receivable (they owe you)</option>
              <option value={LoanType.PAYABLE}>Payable (you owe them)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Total amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={create.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {create.isPending ? "Saving..." : "Create"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editingLoan} onClose={() => setEditingLoan(null)} title="Edit loan">
        {editingLoan && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextTotal = parseFloat(editingLoan.total);
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
                <option value="">Select...</option>
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
                <option value={LoanType.RECEIVABLE}>Receivable (they owe you)</option>
                <option value={LoanType.PAYABLE}>Payable (you owe them)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Total amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingLoan.total}
                onChange={(event) =>
                  setEditingLoan((current) => (current ? { ...current, total: event.target.value } : current))
                }
                required
              />
            </div>
            <button type="submit" disabled={update.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {update.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      <Modal open={!!payOpen} onClose={() => setPayOpen(null)} title="Record payment">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!payOpen) return;
            const nextAmount = parseFloat(payAmount);
            if (Number.isNaN(nextAmount) || nextAmount <= 0) {
              toast.error("Enter a valid amount");
              return;
            }
            addTx.mutate({
              loanId: payOpen,
              amount: nextAmount,
              date: new Date(payDate),
              note: payNote || null,
            });
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
            <input type="number" step="0.01" className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Date</label>
            <input type="date" className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" value={payDate} onChange={(event) => setPayDate(event.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Note</label>
            <input className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" value={payNote} onChange={(event) => setPayNote(event.target.value)} />
          </div>
          <button type="submit" disabled={addTx.isPending} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {addTx.isPending ? "Saving..." : "Save payment"}
          </button>
        </form>
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
    </div>
  );
}
