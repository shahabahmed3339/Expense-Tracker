"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/budgets", label: "Budgets" },
  { href: "/loans", label: "Loans" },
  { href: "/groups", label: "Groups" },
  { href: "/categories", label: "Categories" },
  { href: "/splits", label: "Splits" },
];

function SignOutButton({
  size = "default",
  onClick,
}: {
  size?: "default" | "sm";
  onClick: () => void;
}) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`motion-control inline-flex ${sizeClass} items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] transition-colors hover:bg-[var(--nav-hover)] hover:text-red-500 dark:hover:text-red-400`}
      aria-label="Sign out"
      title="Sign out"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 17l5-5m0 0l-5-5m5 5H9m4 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1"
        />
      </svg>
    </button>
  );
}

function SidebarToggleButton({
  open,
  size = "default",
  onClick,
  mobile = false,
}: {
  open: boolean;
  size?: "default" | "sm";
  onClick: () => void;
  mobile?: boolean;
}) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`motion-control inline-flex ${sizeClass} items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--nav-hover)]`}
      aria-label={mobile ? (open ? "Close menu" : "Open menu") : open ? "Collapse sidebar" : "Expand sidebar"}
      title={mobile ? (open ? "Close menu" : "Open menu") : open ? "Collapse sidebar" : "Expand sidebar"}
      aria-expanded={open}
    >
      <svg className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-90 scale-95" : "rotate-0 scale-100"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 17h16" />
      </svg>
    </button>
  );
}

function NavLinks({
  onNavigate,
  pathname,
  className = "",
  collapsed = false,
  animate = false,
  isOpen = true,
}: {
  onNavigate?: () => void;
  pathname: string;
  className?: string;
  collapsed?: boolean;
  animate?: boolean;
  isOpen?: boolean;
}) {
  return (
    <nav className={className}>
      <ul className="flex flex-col gap-0.5 p-2 md:px-2 md:pb-3">
        {links.map((l, index) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          const shortLabel = l.label.charAt(0);
          return (
            <li
              key={l.href}
              className={`transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${animate ? (isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0") : ""}`}
              style={animate ? { transitionDelay: isOpen ? `${80 + index * 35}ms` : "0ms" } : undefined}
            >
              <Link
                href={l.href}
                onClick={onNavigate}
                aria-label={l.label}
                title={l.label}
                className={`motion-control block rounded-md px-3 py-2.5 text-sm transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] md:py-2 ${active
                    ? "bg-[var(--nav-active-bg)] font-medium text-accent"
                    : "text-[var(--muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--fg)]"
                  } ${collapsed ? "text-center" : ""}`}
              >
                <span className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                  <span
                    className={`inline-flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed
                        ? "h-7 w-7 scale-100 border border-[var(--border)]/70 opacity-100"
                        : "h-0 w-0 scale-75 border border-transparent opacity-0"
                      }`}
                    aria-hidden={!collapsed}
                  >
                    {shortLabel}
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "max-w-0 -translate-x-2 opacity-0" : "max-w-[10rem] translate-x-0 opacity-100"
                      }`}
                    aria-hidden={collapsed}
                  >
                    {l.label}
                  </span>
                </span>
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem("expense-tracker-sidebar-open");
    if (stored !== null) {
      setDesktopSidebarOpen(stored === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("expense-tracker-sidebar-open", String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

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

  const requestLogout = () => setLogoutOpen(true);
  const confirmLogout = () => {
    setLogoutOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row">
      {/* Mobile header */}
      <header className="motion-shell sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2.5 md:hidden safe-pt">
        <span className="min-w-0 truncate text-base font-semibold tracking-tight">Expense Tracker</span>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <SignOutButton onClick={requestLogout} />
          <SidebarToggleButton mobile open={mobileOpen} onClick={() => setMobileOpen((current) => !current)} />
        </div>
      </header>

      {/* Mobile drawer */}
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-[var(--overlay)] transition-opacity duration-300 ease-out md:hidden ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        aria-label="Close menu"
        title="Close menu"
        onClick={() => setMobileOpen(false)}
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside
        className={`motion-shell fixed inset-y-0 right-0 z-50 flex w-[min(18rem,88vw)] flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:hidden safe-pb ${mobileOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
          }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5 safe-pt">
          <span className="font-semibold">Menu</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton onClick={requestLogout} />
            <SidebarToggleButton mobile open={mobileOpen} onClick={() => setMobileOpen(false)} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} animate isOpen={mobileOpen} />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`motion-shell hidden shrink-0 flex-col border-b-0 border-r border-[var(--border)] bg-[var(--card)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex ${desktopSidebarOpen ? "w-80" : "w-20"
          }`}
      >
        <div
          className={`p-4 pb-2 ${desktopSidebarOpen ? "flex items-center justify-between gap-2" : "flex flex-col items-center"
            }`}
        >
          <div className={`flex ${desktopSidebarOpen ? "items-center gap-2" : "flex-col items-center gap-2"}`}>
            <SidebarToggleButton open={desktopSidebarOpen} size="sm" onClick={() => setDesktopSidebarOpen((current) => !current)} />
            <ThemeToggle size="sm" />
            <SignOutButton size="sm" onClick={requestLogout} />
          </div>
          <div
            className={`overflow-hidden whitespace-nowrap font-semibold tracking-tight transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${desktopSidebarOpen ? "max-w-[12rem] translate-x-0 text-lg opacity-100 delay-75" : "max-w-0 -translate-x-3 text-base opacity-0"
              }`}
            aria-hidden={!desktopSidebarOpen}
          >
            Expense Tracker
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} collapsed={!desktopSidebarOpen} />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:p-8 md:px-8 lg:mx-auto lg:max-w-6xl lg:w-full safe-pb">
        <div className="motion-page">{children}</div>
      </main>

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out?"
        description="You will be logged out of Expense Tracker and returned to the login screen."
        confirmText="Sign out"
        tone="danger"
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
