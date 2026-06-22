type MonthInputProps = {
  label?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function MonthInput({
  label = "Month",
  id,
  value,
  onChange,
  className,
}: MonthInputProps) {
  return (
    <label className={className ?? "text-sm text-[var(--muted)]"} htmlFor={id}>
      {label}{" "}
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ml-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
      />
    </label>
  );
}
