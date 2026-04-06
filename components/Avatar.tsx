"use client";

export function Avatar({
  name,
  image,
  size = "md",
}: {
  name?: string | null;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  } as const;

  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  if (image?.trim()) {
    return (
      <img
        src={image}
        alt={name ? `${name} avatar` : "User avatar"}
        className={`${sizes[size]} rounded-full border border-[var(--border)] object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizes[size]} inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--nav-hover)] font-semibold text-[var(--fg)]`}
      aria-label={name ? `${name} avatar` : "User avatar"}
      title={name ?? "User"}
    >
      {initials}
    </span>
  );
}
