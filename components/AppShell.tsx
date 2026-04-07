"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
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

function AccountMenu({
  name,
  email,
  image,
  onLogout,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = name?.trim() || "Your profile";
  const displayEmail = email?.trim() || "No email available";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="motion-control inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] transition-colors hover:bg-[var(--nav-hover)]"
        aria-label="Open account menu"
        title={displayName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <Avatar name={name} image={image} size="sm" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="rounded-2xl bg-[var(--nav-hover)]/60 px-4 py-5 text-center">
            <div className="flex justify-center">
              <Avatar name={name} image={image} size="lg" />
            </div>
            <p className="mt-3 text-base font-semibold text-[var(--fg)]">{displayName}</p>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{displayEmail}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[var(--nav-hover)]"
            >
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="inline-flex w-full items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
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
              className={`transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${animate ? (isOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0") : ""}`}
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
                    className={`overflow-hidden whitespace-nowrap transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "max-w-0 -translate-x-2 opacity-0" : "h-7 max-w-[10rem] translate-x-0 translate-y-1 opacity-100"
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
  const { data: session } = useSession();
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
    <div className="min-h-[100dvh] flex flex-col">
      <header className="motion-shell sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 safe-pt">
        <div className="flex items-center gap-3">
          <div className="max-md:hidden">
            <SidebarToggleButton size="sm" open={desktopSidebarOpen} onClick={() => setDesktopSidebarOpen((current) => !current)} />
          </div>
          <div className="md:hidden">
            <SidebarToggleButton size="sm" mobile open={mobileOpen} onClick={() => setMobileOpen((current) => !current)} />
          </div>
          <Image
            src="/Logo.PNG"
            alt="Expense Tracker"
            width={32}
            height={32}
            className="h-8 w-8 rounded"
            priority
          />
          <span className="hidden min-w-0 truncate whitespace-nowrap font-semibold tracking-tight text-lg sm:inline">Expense Tracker</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle size="sm" />
          <AccountMenu
            name={session?.user?.name}
            email={session?.user?.email}
            image={session?.user?.image}
            onLogout={requestLogout}
          />
        </div>
      </header>

      {/* Mobile drawer */}
      <button
        type="button"
        className={`drawer-backdrop fixed inset-0 z-40 bg-[var(--overlay)] md:hidden ${mobileOpen ? "open" : ""}`}
        aria-label="Close menu"
        title="Close menu"
        onClick={() => setMobileOpen(false)}
        tabIndex={mobileOpen ? 0 : -1}
      />
      <aside
        className={`drawer-panel motion-shell fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--border)] bg-[var(--card)] shadow-xl md:hidden safe-pb ${mobileOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 safe-pt">
          <div className="flex items-center gap-2">
            <SidebarToggleButton size="sm" mobile open={mobileOpen} onClick={() => setMobileOpen(false)} />
          </div>
          <span className="font-semibold">Menu</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} animate isOpen={mobileOpen} />
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 md:flex-row">
        {/* Desktop sidebar */}
        <aside
          className={`motion-shell hidden shrink-0 flex-col border-b-0 border-r border-[var(--border)] bg-[var(--card)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex ${desktopSidebarOpen ? "w-80" : "w-20"
            }`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto pt-3">
            <NavLinks pathname={pathname} collapsed={!desktopSidebarOpen} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:p-8 md:px-8 lg:mx-auto lg:max-w-6xl lg:w-full safe-pb">
          <div className="motion-page">{children}</div>
        </main>
      </div>

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
