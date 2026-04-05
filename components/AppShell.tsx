"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/budgets", label: "Budgets" },
  { href: "/loans", label: "Loans" },
  { href: "/groups", label: "Groups" },
  { href: "/categories", label: "Categories" },
  { href: "/splits", label: "Splits" },
];

function NavLinks({
  onNavigate,
  pathname,
  className = "",
}: {
  onNavigate?: () => void;
  pathname: string;
  className?: string;
}) {
  return (
    <nav className={className}>
      <ul className="flex flex-col gap-0.5 p-2 md:px-2 md:pb-3">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className={`block rounded-md px-3 py-2.5 text-sm transition-colors md:py-2 ${
                  active
                    ? "bg-[var(--nav-active-bg)] font-medium text-accent"
                    : "text-[var(--muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--fg)]"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2.5 md:hidden safe-pt">
        <span className="min-w-0 truncate text-base font-semibold tracking-tight">Expense Tracker</span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:bg-[var(--nav-hover)]"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--overlay)] md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-[min(18rem,88vw)] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-xl md:hidden safe-pb"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--nav-hover)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-[var(--border)] p-2">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full rounded-md px-3 py-3 text-left text-sm text-[var(--muted)] hover:bg-[var(--nav-hover)] hover:text-red-500 dark:hover:text-red-400"
              >
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-b-0 border-r border-[var(--border)] bg-[var(--card)] md:flex">
        <div className="flex items-center justify-between gap-2 p-4 pb-2">
          <div className="min-w-0 font-semibold text-lg tracking-tight">Expense Tracker</div>
          <ThemeToggle size="sm" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </div>
        <div className="p-2 pb-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--nav-hover)] hover:text-red-500 dark:hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:p-8 md:px-8 lg:mx-auto lg:max-w-6xl lg:w-full safe-pb">
        <div className="motion-page">{children}</div>
      </main>
    </div>
  );
}
