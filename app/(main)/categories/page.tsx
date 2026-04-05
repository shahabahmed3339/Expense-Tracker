"use client";

import { useState } from "react";
import { CategoryType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(CategoryType.VARIABLE);

  const utils = api.useUtils();
  const { data: categories, isLoading, error } = api.category.list.useQuery();

  const create = api.category.create.useMutation({
    onSuccess: async () => {
      await utils.category.list.invalidate();
      toast.success("Category created");
      setOpen(false);
      setName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const del = api.category.delete.useMutation({
    onSuccess: () => utils.category.list.invalidate(),
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Fixed vs variable spending buckets.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New category</Button>
      </div>

      {!categories?.length ? (
        <EmptyState text="No categories yet." />
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-[var(--muted)]">{c.type}</p>
              </div>
              <button
                type="button"
                className="text-sm text-red-400 hover:underline"
                onClick={() => {
                  if (confirm(`Delete category “${c.name}”?`)) del.mutate(c.id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Name is required");
              return;
            }
            create.mutate({ name: name.trim(), type });
          }}
        >
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Name</label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Type</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
            >
              <option value={CategoryType.FIXED}>Fixed</option>
              <option value={CategoryType.VARIABLE}>Variable</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
