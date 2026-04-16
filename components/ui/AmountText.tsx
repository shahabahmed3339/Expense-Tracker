"use client";

import { formatAmount, getBalanceColorClass } from "@/lib/formatting/currency";

export function AmountText({
  value,
  className = "",
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "balance";
}) {
  const toneClass = tone === "balance" ? getBalanceColorClass(value) : "text-[var(--fg)]";

  return (
    <span className={`${toneClass} ${className}`.trim()}>
      {formatAmount(value)}
    </span>
  );
}
