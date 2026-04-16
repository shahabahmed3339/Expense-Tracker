"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/trpc";
import { formatShortDate } from "@/lib/formatting/date";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";
import { InlineCreatePerson } from "@/components/dependencies/InlineCreatePerson";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";

export default function GroupsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<"all" | "with" | "without">("all");
  const [editingPerson, setEditingPerson] = useState<{
    id: string;
    name: string;
    contact: string;
  } | null>(null);
  const [personToDelete, setPersonToDelete] = useState<{ id: string; name: string } | null>(null);

  const utils = api.useUtils();
  const { data: people, isLoading, error } = api.person.list.useQuery();
  const update = api.person.update.useMutation({
    onSuccess: async () => {
      await utils.person.list.invalidate();
      toast.success("Person updated");
      setEditingPerson(null);
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const del = api.person.delete.useMutation({
    onSuccess: () => utils.person.list.invalidate(),
  });

  const filteredPeople = useMemo(() => {
    return (people ?? []).filter((person) => {
      const matchesSearch =
        search.trim().length === 0 ||
        [person.name, person.contact ?? ""].join(" ").toLowerCase().includes(search.toLowerCase());
      const hasContact = Boolean(person.contact?.trim());
      const matchesContact =
        contactFilter === "all" ||
        (contactFilter === "with" ? hasContact : !hasContact);

      return matchesSearch && matchesContact;
    });
  }, [contactFilter, people, search]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">People you split expenses with or track in loans, ordered by most recently updated.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add person</Button>
      </div>

      <FilterBar>
        <FilterField label="Search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or contact"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </FilterField>
        <FilterField label="Contact">
          <select
            value={contactFilter}
            onChange={(event) => setContactFilter(event.target.value as typeof contactFilter)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="with">With contact</option>
            <option value="without">Without contact</option>
          </select>
        </FilterField>
      </FilterBar>

      {!filteredPeople.length ? (
        <EmptyState text="No people match the current filters." />
      ) : (
        <ul className="space-y-2">
          {filteredPeople.map((person) => (
            <li
              key={person.id}
              className="motion-card flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{person.name}</p>
                {person.contact && <p className="text-sm text-[var(--muted)]">{person.contact}</p>}
                <p className="mt-1 text-xs text-[var(--muted)]">Updated {formatShortDate(person.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm text-accent hover:underline"
                  aria-label={`Edit person ${person.name}`}
                  title="Edit person"
                  onClick={() =>
                    setEditingPerson({
                      id: person.id,
                      name: person.name,
                      contact: person.contact ?? "",
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-red-400 transition-colors hover:underline"
                  aria-label={`Delete person ${person.name}`}
                  title="Delete person"
                  onClick={() => setPersonToDelete({ id: person.id, name: person.name })}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New person">
        <InlineCreatePerson startOpen showToggle={false} submitLabel="Save" onCreated={() => setOpen(false)} />
      </Modal>

      <Modal open={!!editingPerson} onClose={() => setEditingPerson(null)} title="Edit person">
        {editingPerson && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const nextName = editingPerson.name.trim();
              if (!nextName) {
                toast.error("Name is required");
                return;
              }
              update.mutate({
                id: editingPerson.id,
                name: nextName,
                contact: editingPerson.contact.trim() || null,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Name</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingPerson.name}
                onChange={(event) =>
                  setEditingPerson((current) => (current ? { ...current, name: event.target.value } : current))
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Contact (optional)</label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={editingPerson.contact}
                onChange={(event) =>
                  setEditingPerson((current) => (current ? { ...current, contact: event.target.value } : current))
                }
              />
            </div>
            <button
              type="submit"
              disabled={update.isPending}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              aria-label={update.isPending ? "Saving person changes" : "Save person changes"}
              title={update.isPending ? "Saving..." : "Save changes"}
            >
              {update.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!personToDelete}
        title="Delete person?"
        description={
          personToDelete
            ? `This removes ${personToDelete.name} if no splits or loans still reference them.`
            : ""
        }
        confirmText="Delete person"
        tone="danger"
        onClose={() => setPersonToDelete(null)}
        onConfirm={() => {
          if (!personToDelete) return;
          del.mutate(personToDelete.id);
          setPersonToDelete(null);
        }}
      />
    </div>
  );
}
