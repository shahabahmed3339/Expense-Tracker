"use client";

import type { Prisma } from "@prisma/client";
import { formatAmount, getBalanceColorClass } from "@/lib/formatting/currency";
import { toNumber } from "@/lib/money";

export type MoneyLike = number | Prisma.Decimal | string;

export function AmountText({
  value,
  className = "",
  tone = "default",
}: {
  value: MoneyLike;
  className?: string;
  tone?: "default" | "balance";
}) {
  const numeric = toNumber(value);
  const toneClass = tone === "balance" ? getBalanceColorClass(numeric) : "text-[var(--fg)]";

  return (
    <span className={`${toneClass} ${className}`.trim()}>
      {formatAmount(numeric)}
    </span>
  );
}
