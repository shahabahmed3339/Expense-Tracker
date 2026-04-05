"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { InlineCreatePanel } from "@/components/dependencies/InlineCreatePanel";
import { toast } from "sonner";

export function InlineCreatePerson({
  onCreated,
  startOpen = false,
  showToggle = true,
  helperText = "Need someone new here?",
  toggleLabel = "Add person",
  submitLabel = "Create person",
}: {
  onCreated?: (personId: string) => void;
  startOpen?: boolean;
  showToggle?: boolean;
  helperText?: string;
  toggleLabel?: string;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const utils = api.useUtils();

  const create = api.person.create.useMutation({
    onSuccess: async (person) => {
      await utils.person.list.invalidate();
      toast.success("Person created");
      setName("");
      setContact("");
      setOpen(false);
      onCreated?.(person.id);
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
          toast.error("Person name is required");
          return;
        }
        create.mutate({ name: nextName, contact: contact.trim() || null });
      }}
    >
      <input
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        placeholder="Person name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        placeholder="Contact (optional)"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
      />
    </InlineCreatePanel>
  );
}
