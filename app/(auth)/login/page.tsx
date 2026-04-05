"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader } from "@/components/Loader";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
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
        <h1 className="exp-auth-title">Sign in</h1>
        <p className="exp-auth-sub">Use your email and password to continue.</p>

        <div className="exp-auth-field">
          <label className="exp-auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="exp-auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="exp-auth-field">
          <label className="exp-auth-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="exp-auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="........"
          />
        </div>

        <div className="exp-auth-actions">
          <button
            type="button"
            disabled={pending}
            className="exp-auth-primary"
            onClick={async () => {
              setPending(true);
              const res = await signIn("credentials", {
                email: email.trim().toLowerCase(),
                password,
                redirect: false,
              });
              setPending(false);
              if (res?.error) toast.error("Invalid email or password");
              else router.replace("/dashboard");
            }}
          >
            {pending ? "Signing in..." : "Sign in with email"}
          </button>
          {!!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <button
              type="button"
              className="exp-auth-secondary"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              Continue with Google
            </button>
          )}
        </div>

        <p className="exp-auth-footer">
          No account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
