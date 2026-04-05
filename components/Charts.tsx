"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type ChartRow = { month: string; expense?: number; budget?: number };

export function MultiChart({ data }: { data: ChartRow[] }) {
  if (!data.length) {
    return <p className="text-sm text-[var(--muted)]">No data for chart yet.</p>;
  }
  return (
    <div className="h-56 w-full min-w-0 sm:h-64 md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <XAxis dataKey="month" stroke="var(--chart-axis)" fontSize={11} tick={{ fill: "var(--chart-axis)" }} />
          <YAxis stroke="var(--chart-axis)" fontSize={11} tick={{ fill: "var(--chart-axis)" }} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              borderRadius: 8,
              color: "var(--chart-tooltip-fg)",
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="expense" name="Expenses" stroke="#3b82f6" dot={false} />
          {data.some((d) => d.budget != null) && (
            <Line type="monotone" dataKey="budget" name="Budget" stroke="#34d399" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
