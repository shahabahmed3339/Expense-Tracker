"use client";

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-50"
    >
      {children}
    </button>
  );
}
