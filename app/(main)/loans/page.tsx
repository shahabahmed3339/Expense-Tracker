"use client";

import { useState } from "react";
import { LoanType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function LoansPage() {
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");
  const [type, setType] = useState<LoanType>(LoanType.RECEIVABLE);
  const [total, setTotal] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

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
    onError: (e) => toast.error(e.message),
  });

  const addTx = api.loan.addTransaction.useMutation({
    onSuccess: async () => {
      await utils.loan.list.invalidate();
      toast.success("Payment recorded");
      setPayOpen(null);
      setPayAmount("");
      setPayNote("");
    },
    onError: (e) => toast.error(e.message),
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
          <p className="text-sm text-[var(--muted)] mt-1">Receivables and payables by person.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New loan</Button>
      </div>

      {!loans?.length ? (
        <EmptyState text="No loans yet." />
      ) : (
        <ul className="space-y-4">
          {loans.map((loan) => {
            const paid = loan.transactions.reduce((s, t) => s + t.amount, 0);
            const remaining = loan.totalAmount - paid;
            return (
              <li
                key={loan.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-2"
              >
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
                    <p
                      className={`tabular-nums font-medium ${
                        remaining > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      Remaining: {remaining.toFixed(2)}
                    </p>
                  </div>
                </div>
                {loan.transactions.length > 0 && (
                  <ul className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-2 space-y-1">
                    {loan.transactions.slice(0, 5).map((t) => (
                      <li key={t.id} className="flex justify-between">
                        <span>{new Date(t.date).toLocaleDateString()}</span>
                        <span className="tabular-nums">{t.amount.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="text-sm text-accent hover:underline"
                    onClick={() => setPayOpen(loan.id)}
                  >
                    Add payment
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-400 hover:underline"
                    onClick={() => {
                      if (confirm("Delete this loan and its payments?")) del.mutate(loan.id);
                    }}
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
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseFloat(total);
            if (Number.isNaN(n) || n <= 0) {
              toast.error("Enter a valid total");
              return;
            }
            if (!personId) {
              toast.error("Pick a person");
              return;
            }
            create.mutate({ personId, type, totalAmount: n });
          }}
        >
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Person</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {people?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Type</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as LoanType)}
            >
              <option value={LoanType.RECEIVABLE}>Receivable (they owe you)</option>
              <option value={LoanType.PAYABLE}>Payable (you owe them)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Total amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Create"}
          </button>
        </form>
      </Modal>

      <Modal
        open={!!payOpen}
        onClose={() => setPayOpen(null)}
        title="Record payment"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!payOpen) return;
            const n = parseFloat(payAmount);
            if (Number.isNaN(n) || n <= 0) {
              toast.error("Enter a valid amount");
              return;
            }
            addTx.mutate({
              loanId: payOpen,
              amount: n,
              date: new Date(payDate),
              note: payNote || null,
            });
          }}
        >
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Note</label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={addTx.isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addTx.isPending ? "Saving…" : "Save payment"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
