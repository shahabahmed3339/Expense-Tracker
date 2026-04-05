"use client";

import { useForm } from "react-hook-form";
import { api } from "@/lib/trpc";
import { toast } from "sonner";

type FormValues = {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
};

export function ExpenseForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const utils = api.useUtils();
  const { data: categories } = api.category.list.useQuery();
  const create = api.expense.create.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.dashboard.summary.invalidate();
      toast.success("Expense saved");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      categoryId: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((values) => {
        const amount = parseFloat(values.amount);
        if (Number.isNaN(amount) || amount <= 0) {
          toast.error("Enter a valid amount");
          return;
        }
        if (!values.categoryId) {
          toast.error("Pick a category");
          return;
        }
        create.mutate({
          amount,
          categoryId: values.categoryId,
          date: new Date(values.date),
          note: values.note || null,
        });
        reset({
          amount: "",
          categoryId: values.categoryId,
          date: values.date,
          note: "",
        });
      })}
    >
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("amount", { required: true })}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("categoryId", { required: true })}
        >
          <option value="">Select…</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Date</label>
        <input
          type="date"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("date", { required: true })}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Note</label>
        <input
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("note")}
        />
      </div>
      <button
        type="submit"
        disabled={create.isPending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
      >
        {create.isPending ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
