"use client";

import { useEffect, useRef, useState } from "react";
import {
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartRow = { month: string; expense?: number; budget?: number };

export function MultiChart({ data }: { data: ChartRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const nextWidth = element.clientWidth;
      const nextHeight = element.clientHeight;
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (!data.length) {
    return <p className="text-sm text-[var(--muted)]">No data for chart yet.</p>;
  }

  return (
    <div ref={containerRef} className="h-56 w-full min-w-0 min-h-0 sm:h-64 md:h-72">
      {size.width > 0 && size.height > 0 ? (
        <LineChart
          width={size.width}
          height={size.height}
          data={data}
          margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
        >
          <XAxis
            dataKey="month"
            stroke="var(--chart-axis)"
            fontSize={11}
            tick={{ fill: "var(--chart-axis)" }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tick={{ fill: "var(--chart-axis)" }}
            width={40}
          />
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
          {data.some((row) => row.budget != null) && (
            <Line type="monotone" dataKey="budget" name="Budget" stroke="#34d399" dot={false} />
          )}
        </LineChart>
      ) : null}
    </div>
  );
}
