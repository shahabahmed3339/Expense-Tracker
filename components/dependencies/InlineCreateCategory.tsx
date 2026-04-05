"use client";

import { useState } from "react";
import { CategoryType } from "@prisma/client";
import { api } from "@/lib/trpc";
import { InlineCreatePanel } from "@/components/dependencies/InlineCreatePanel";
import { toast } from "sonner";

export function InlineCreateCategory({
  onCreated,
  defaultType = CategoryType.VARIABLE,
  startOpen = false,
  showToggle = true,
  helperText = "Missing the category you need?",
  toggleLabel = "Add category",
  submitLabel = "Create category",
}: {
  onCreated?: (categoryId: string) => void;
  defaultType?: CategoryType;
  startOpen?: boolean;
  showToggle?: boolean;
  helperText?: string;
  toggleLabel?: string;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(defaultType);
  const utils = api.useUtils();

  const create = api.category.create.useMutation({
    onSuccess: async (category) => {
      await utils.category.list.invalidate();
      toast.success("Category created");
      setName("");
      setType(defaultType);
      setOpen(false);
      onCreated?.(category.id);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <InlineCreatePanel
      open={open}
      showToggle={showToggle}
      helperText={helperText}
      toggleLabel={toggleLabel}
      submitLabel={submitLabel}
      pendingLabel="Creating..."
      isPending={create.isPending}
      onToggle={() => setOpen((value) => !value)}
      onSubmit={() => {
        const nextName = name.trim();
        if (!nextName) {
          toast.error("Category name is required");
          return;
        }
        create.mutate({ name: nextName, type });
      }}
    >
      <input
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        placeholder="Category name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <select
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        value={type}
        onChange={(event) => setType(event.target.value as CategoryType)}
      >
        <option value={CategoryType.FIXED}>Fixed</option>
        <option value={CategoryType.VARIABLE}>Variable</option>
      </select>
    </InlineCreatePanel>
  );
}
