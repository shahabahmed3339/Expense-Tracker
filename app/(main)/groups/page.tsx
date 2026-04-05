"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function GroupsPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const utils = api.useUtils();
  const { data: people, isLoading, error } = api.person.list.useQuery();

  const create = api.person.create.useMutation({
    onSuccess: async () => {
      await utils.person.list.invalidate();
      toast.success("Person added");
      setOpen(false);
      setName("");
      setContact("");
    },
    onError: (e) => toast.error(e.message),
  });

  const del = api.person.delete.useMutation({
    onSuccess: () => utils.person.list.invalidate(),
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            People you split expenses with or track in loans.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Add person</Button>
      </div>

      {!people?.length ? (
        <EmptyState text="No people yet. Add someone to use splits and loans." />
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                {p.contact && <p className="text-sm text-[var(--muted)]">{p.contact}</p>}
              </div>
              <button
                type="button"
                className="text-sm text-red-400 hover:underline"
                onClick={() => {
                  if (confirm(`Remove ${p.name}?`)) del.mutate(p.id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New person">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Name is required");
              return;
            }
            create.mutate({ name: name.trim(), contact: contact.trim() || null });
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
            <label className="block text-xs text-[var(--muted)] mb-1">Contact (optional)</label>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
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
