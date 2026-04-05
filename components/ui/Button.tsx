"use client";

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const textLabel = typeof children === "string" ? children : undefined;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title ?? textLabel}
      aria-label={ariaLabel ?? textLabel}
      className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}
