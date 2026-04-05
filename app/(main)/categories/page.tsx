"use client";

import { useState } from "react";
import { CategoryType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineCreateCategory } from "@/components/dependencies/InlineCreateCategory";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    type: CategoryType;
  } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const utils = api.useUtils();
  const { data: categories, isLoading, error } = api.category.list.useQuery();
  const update = api.category.update.useMutation({
    onSuccess: async () => {
      await utils.category.list.invalidate();
      toast.success("Category updated");
      setEditingCategory(null);
    },
    onError: (error) => toast.error(error.message),
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
          <p className="mt-1 text-sm text-[var(--muted)]">Fixed vs variable spending buckets.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New category</Button>
      </div>

      {!categories?.length ? (
        <EmptyState text="No categories yet." />
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="motion-card flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-[var(--muted)]">{category.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm text-accent hover:underline"
                  aria-label={`Edit category ${category.name}`}
                  title="Edit category"
                  onClick={() =>
                    setEditingCategory({
                      id: category.id,
                      name: category.name,
                      type: category.type,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-red-400 transition-colors hover:underline"
                  aria-label={`Delete category ${category.name}`}
                  title="Delete category"
                  onClick={() => setCategoryToDelete({ id: category.id, name: category.name })}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <InlineCreateCategory startOpen showToggle={false} submitLabel="Save" onCreated={() => setOpen(false)} />
      </Modal>

      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} title="Edit category">
        {editingCategory && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextName = editingCategory.name.trim();
              if (!nextName) {
                toast.error("Name is required");
                return;
              }
              update.mutate({
                id: editingCategory.id,
                name: nextName,
                type: editingCategory.type,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Name</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingCategory.name}
                onChange={(event) =>
                  setEditingCategory((current) => (current ? { ...current, name: event.target.value } : current))
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Type</label>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingCategory.type}
                onChange={(event) =>
                  setEditingCategory((current) =>
                    current ? { ...current, type: event.target.value as CategoryType } : current,
                  )
                }
              >
                <option value={CategoryType.FIXED}>Fixed</option>
                <option value={CategoryType.VARIABLE}>Variable</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={update.isPending}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              aria-label={update.isPending ? "Saving category changes" : "Save category changes"}
              title={update.isPending ? "Saving..." : "Save changes"}
            >
              {update.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!categoryToDelete}
        title="Delete category?"
        description={
          categoryToDelete
            ? `This will remove "${categoryToDelete.name}" if there are no related budgets or expenses blocking deletion.`
            : ""
        }
        confirmText="Delete category"
        tone="danger"
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (!categoryToDelete) return;
          del.mutate(categoryToDelete.id);
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
}
