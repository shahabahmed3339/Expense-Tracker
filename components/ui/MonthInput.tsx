type MonthInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function MonthInput({
  label = "Month",
  value,
  onChange,
  className,
}: MonthInputProps) {
  return (
    <label className={className ?? "text-sm text-[var(--muted)]"}>
      {label}{" "}
      <input
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ml-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
      />
    </label>
  );
}
