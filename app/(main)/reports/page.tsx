"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/trpc";
import { currentMonthValue } from "@/lib/dates/month";
import { formatAmount } from "@/lib/formatting/currency";
import { MonthInput } from "@/components/ui/MonthInput";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/Loader";
import { ErrorState } from "@/components/ErrorState";
import { FilterBar, FilterField } from "@/components/ui/FilterBar";

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonthValue);
  const { data, isLoading, error, refetch } = api.reports.monthly.useQuery({ month });
  const exportMutation = api.reports.exportData.useMutation({
    onSuccess: (payload) => {
      downloadFile(
        `expense-tracker-export-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      toast.success("Data export downloaded");
    },
    onError: (e) => toast.error(e.message),
  });

  const csvRows = useMemo(() => {
    if (!data) return [];
    return data.expenses.map((expense) => ({
      date: new Date(expense.date).toISOString().slice(0, 10),
      category: expense.categoryName,
      amount: expense.amount,
      note: expense.note ?? "",
    }));
  }, [data]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="motion-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">Reports</h1>
        <p className="text-sm text-[var(--muted)]">Monthly summaries, exports, and data portability.</p>
      </div>

      <FilterBar>
        <FilterField label="Month" htmlFor="reports-month">
          <MonthInput id="reports-month" value={month} onChange={setMonth} />
        </FilterField>
      </FilterBar>

      <section className="motion-card rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold mb-2">Monthly summary — {month}</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Total spent: <strong>{formatAmount(data?.totalSpent ?? 0)}</strong>
        </p>
        <ul className="space-y-2 text-sm">
          {(data?.byCategory ?? []).map((row) => (
            <li key={row.categoryId} className="flex justify-between gap-4">
              <span>{row.categoryName}</span>
              <span>{formatAmount(row.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            if (!csvRows.length) {
              toast.error("No expenses to export for this month");
              return;
            }
            downloadFile(`expenses-${month}.csv`, toCsv(csvRows), "text/csv");
          }}
        >
          Export month CSV
        </Button>
        <Button
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? "Exporting..." : "Export all data (JSON)"}
        </Button>
      </section>
    </div>
  );
}
