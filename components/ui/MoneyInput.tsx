"use client";

import { normalizeAmountInput } from "@/lib/formatting/currency";

type MoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
};

export function MoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  className = "",
  required,
  id,
  name,
  disabled,
}: MoneyInputProps) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(normalizeAmountInput(event.target.value))}
      className={`w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm tabular-nums ${className}`.trim()}
      required={required}
      disabled={disabled}
    />
  );
}
