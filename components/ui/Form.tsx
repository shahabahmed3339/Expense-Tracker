"use client";

import { useForm } from "react-hook-form";

type FormData = { amount: string };

export function Form({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const { register, handleSubmit } = useForm<FormData>();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <input
        {...register("amount")}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim"
        aria-label="Save"
        title="Save"
      >
        Save
      </button>
    </form>
  );
}
