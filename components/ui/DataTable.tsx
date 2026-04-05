"use client";

import { useState } from "react";

export function DataTable({ data }: { data: Record<string, unknown>[] }) {
  const [query, setQuery] = useState("");
  if (!data.length) {
    return <p className="text-sm text-[var(--muted)]">No data</p>;
  }
  const filtered = data.filter((d) =>
    JSON.stringify(d).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-2 overflow-x-auto">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:min-h-0"
      />
      <table className="w-full min-w-[20rem] border border-[var(--border)] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
            {Object.keys(data[0]).map((k) => (
              <th key={k} className="p-2 text-left font-medium">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              {Object.values(row).map((v, j) => (
                <td key={j} className="p-2">
                  {String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
