"use client";

import { useMemo, useState } from "react";
import { CategoryType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { CATEGORY_TYPE_LABELS } from "@/lib/constants/domain";
import { COMMON_UI } from "@/lib/constants/ui";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { InlineCreateCategory } from "@/components/dependencies/InlineCreateCategory";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const del = api.category.delete.useMutation({
    onSuccess: () => utils.category.list.invalidate(),
  });

  const filteredCategories = useMemo(() => {
    return (categories ?? []).filter((category) => {
      const matchesSearch =
        search.trim().length === 0 ||
        category.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || category.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [categories, search, typeFilter]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Fixed vs variable spending buckets, ordered by most recently updated.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New category</Button>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Category name"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Type">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value={CategoryType.FIXED}>{CATEGORY_TYPE_LABELS[CategoryType.FIXED]}</option>
            <option value={CategoryType.VARIABLE}>{CATEGORY_TYPE_LABELS[CategoryType.VARIABLE]}</option>
          </select>
        </FilterField>
      </FilterBar>

      {!filteredCategories.length ? (
        <EmptyState text="No categories match the current filters." />
      ) : (
        <ul className="space-y-2">
          {filteredCategories.map((category) => (
            <li
              key={category.id}
              className="motion-card flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-[var(--muted)]">{CATEGORY_TYPE_LABELS[category.type]}</p>
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
                <option value={CategoryType.FIXED}>{CATEGORY_TYPE_LABELS[CategoryType.FIXED]}</option>
                <option value={CategoryType.VARIABLE}>{CATEGORY_TYPE_LABELS[CategoryType.VARIABLE]}</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={update.isPending}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              aria-label={update.isPending ? `Saving category changes` : `Save category changes`}
              title={update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}
            >
              {update.isPending ? COMMON_UI.saving : COMMON_UI.saveChanges}
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
