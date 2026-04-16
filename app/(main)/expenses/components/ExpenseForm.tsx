"use client";

import { useForm } from "react-hook-form";
import { api } from "@/lib/trpc";
import { parseAmountInput } from "@/lib/formatting/currency";
import { InlineCreateCategory } from "@/components/dependencies/InlineCreateCategory";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { toast } from "sonner";

export type ExpenseFormValues = {
  amount: string;
  categoryId: string;
  date: string;
  note: string;
};

export function ExpenseForm({
  onSuccess,
  onCreated,
  expenseId,
  initialValues,
}: {
  onSuccess?: () => void;
  onCreated?: (expenseId: string) => void;
  expenseId?: string;
  initialValues?: ExpenseFormValues;
}) {
  const utils = api.useUtils();
  const { data: categories } = api.category.list.useQuery();

  const create = api.expense.create.useMutation({
    onSuccess: async (expense) => {
      await utils.expense.list.invalidate();
      await utils.dashboard.summary.invalidate();
      toast.success("Expense saved");
      onCreated?.(expense.id);
      onSuccess?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const update = api.expense.update.useMutation({
    onSuccess: async () => {
      await utils.expense.list.invalidate();
      await utils.dashboard.summary.invalidate();
      toast.success("Expense updated");
      onSuccess?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const { register, handleSubmit, reset, getValues, setValue, watch } = useForm<ExpenseFormValues>({
    defaultValues:
      initialValues ?? {
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
        const amount = parseAmountInput(values.amount);
        if (Number.isNaN(amount) || amount <= 0) {
          toast.error("Enter a valid amount");
          return;
        }
        if (!values.categoryId) {
          toast.error("Pick a category");
          return;
        }

        if (expenseId) {
          update.mutate({
            id: expenseId,
            amount,
            categoryId: values.categoryId,
            date: new Date(values.date),
            note: values.note || null,
          });
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
        <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
        <MoneyInput
          value={watch("amount")}
          onChange={(value) => setValue("amount", value, { shouldDirty: true })}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Category</label>
        <select
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("categoryId", { required: true })}
        >
          <option value="">Select...</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <InlineCreateCategory
        onCreated={(nextCategoryId) => {
          reset({
            ...getValues(),
            categoryId: nextCategoryId,
          });
        }}
      />

      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Date</label>
        <input
          type="date"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("date", { required: true })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">Note</label>
        <input
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          {...register("note")}
        />
      </div>

      <button
        type="submit"
        disabled={create.isPending || update.isPending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
      >
        {create.isPending || update.isPending ? "Saving..." : expenseId ? "Save changes" : "Save expense"}
      </button>
    </form>
  );
}
