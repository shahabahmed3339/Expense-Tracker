import { toNumber } from "@/lib/money";

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(value: number | string | { toNumber?: () => number }) {
  const numeric = toNumber(value as number);
  if (!Number.isFinite(numeric)) {
    return amountFormatter.format(0);
  }

  return amountFormatter.format(numeric);
}

export function getBalanceColorClass(value: number) {
  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (value < 0) {
    return "text-red-600 dark:text-red-400";
  }

  return "text-[var(--fg)]";
}

export function normalizeAmountInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const negative = trimmed.startsWith("-");
  const digitsOnly = trimmed.replace(/[^0-9.]/g, "");
  const [integerPart = "", ...decimalParts] = digitsOnly.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
  const formattedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalPart = decimalParts.join("").slice(0, 2);

  return `${negative ? "-" : ""}${formattedInteger}${digitsOnly.includes(".") ? `.${decimalPart}` : ""}`;
}

export function parseAmountInput(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return Number.NaN;
  }

  return Number.parseFloat(normalized);
}
