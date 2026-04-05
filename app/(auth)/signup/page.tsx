"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader } from "@/components/Loader";

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="exp-auth-root">
        <div className="exp-auth-loading">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="exp-auth-root">
      <div className="exp-auth-brand">
        <div className="exp-auth-brand-row">
          <div className="exp-auth-brand-mark" aria-hidden>
            E
          </div>
          <ThemeToggle size="sm" />
        </div>
        <div className="exp-auth-brand-name">Expense Tracker</div>
      </div>

      <div className="exp-auth-card">
        <h1 className="exp-auth-title">Create account</h1>
        <p className="exp-auth-sub">Start tracking budgets and expenses in one place.</p>

        <div className="exp-auth-field">
          <label className="exp-auth-label" htmlFor="signup-name">
            Name <span className="exp-auth-label-optional">(optional)</span>
          </label>
          <input
            id="signup-name"
            className="exp-auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Doe"
          />
        </div>

        <div className="exp-auth-field">
          <label className="exp-auth-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            className="exp-auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="exp-auth-field">
          <label className="exp-auth-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            className="exp-auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="exp-auth-actions">
          <button
            type="button"
            disabled={pending}
            className="exp-auth-primary"
            onClick={async () => {
              setPending(true);
              try {
                const res = await fetch("/api/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    name: name.trim() || undefined,
                  }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(body.error ?? "Signup failed");
                  return;
                }
                toast.success("Account created - sign in");
                router.push("/login");
              } catch {
                toast.error("Network error");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Creating..." : "Create account"}
          </button>
        </div>

        <p className="exp-auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
