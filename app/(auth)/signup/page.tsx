"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader } from "@/components/Loader";
import { getPasswordValidationMessage, validatePassword } from "@/lib/auth/password";
import { toast } from "sonner";

export default function SignupPage() {
  const { status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = "/dashboard";
    }
  }, [status]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="exp-auth-root">
        <div className="exp-auth-loading">
          <Loader />
        </div>
      </div>
    );
  }

  const passwordState = validatePassword(password);
  const passwordError = getPasswordValidationMessage(password);
  const confirmError = confirmPassword && password !== confirmPassword ? "Passwords do not match." : null;

  const resendVerification = async () => {
    setResendingVerification(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Unable to resend verification email");
        return;
      }
      toast.success("Verification email resent");
    } catch {
      toast.error("Network error");
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="exp-auth-root">
      <div className="exp-auth-brand">
        <div className="exp-auth-brand-row">
          <Image
            src="/Logo.PNG"
            alt="Expense Tracker Logo"
            width={44}
            height={44}
            className="exp-auth-logo"
            priority
          />
          <ThemeToggle size="sm" />
        </div>
        <div className="exp-auth-brand-name">Expense Tracker</div>
      </div>

      <div className="exp-auth-card">
        <h1 className="exp-auth-title">Create account</h1>
        <p className="exp-auth-sub">Start tracking budgets and expenses in one place.</p>

        {registeredEmail ? (
          <div className="exp-auth-notice">
            <p className="exp-auth-helper">We sent a verification email to {registeredEmail}. It expires in 24 hours.</p>
            <div className="exp-auth-actions">
              <button
                type="button"
                className="exp-auth-secondary"
                onClick={resendVerification}
                disabled={resendingVerification}
                aria-label="Resend verification email"
                title="Resend verification email"
              >
                <span className="exp-auth-button-content">
                  {resendingVerification ? <span className="spinner" aria-hidden="true" /> : null}
                  {resendingVerification ? "Sending..." : "Resend verification email"}
                </span>
              </button>
              <Link href="/login" aria-label="Go to sign in page" title="Sign in">
                Sign in after verification
              </Link>
            </div>
          </div>
        ) : (
          <>
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
              <div className="exp-auth-input-wrap">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  className="exp-auth-input exp-auth-input-with-action"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="exp-auth-input-action"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <ul className="exp-auth-password-list">
                <li className="exp-auth-password-item" data-pass={passwordState.checks.minLength}>At least 8 characters</li>
                <li className="exp-auth-password-item" data-pass={passwordState.checks.lowercase}>At least 1 lowercase letter</li>
                <li className="exp-auth-password-item" data-pass={passwordState.checks.uppercase}>At least 1 uppercase letter</li>
                <li className="exp-auth-password-item" data-pass={passwordState.checks.number}>At least 1 number</li>
                <li className="exp-auth-password-item" data-pass={passwordState.checks.special}>At least 1 special character</li>
              </ul>
            </div>

            <div className="exp-auth-field">
              <label className="exp-auth-label" htmlFor="signup-confirm-password">
                Confirm password
              </label>
              <div className="exp-auth-input-wrap">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="exp-auth-input exp-auth-input-with-action"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  className="exp-auth-input-action"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {passwordError ? <p className="exp-auth-helper exp-auth-helper-error">{passwordError}</p> : null}
            {confirmError ? <p className="exp-auth-helper exp-auth-helper-error">{confirmError}</p> : null}

            <div className="exp-auth-actions">
              <button
                type="button"
                disabled={pending}
                className="exp-auth-primary"
                aria-label={pending ? "Creating account" : "Create account"}
                title={pending ? "Creating..." : "Create account"}
                onClick={async () => {
                  const normalizedEmail = email.trim().toLowerCase();
                  if (passwordError) {
                    toast.error(passwordError);
                    return;
                  }
                  if (password !== confirmPassword) {
                    toast.error("Passwords do not match");
                    return;
                  }

                  setPending(true);
                  try {
                    const res = await fetch("/api/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: normalizedEmail,
                        password,
                        name: name.trim() || undefined,
                      }),
                    });
                    const body = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(body.error ?? "Signup failed");
                      return;
                    }
                    setRegisteredEmail(normalizedEmail);
                    toast.success("Account created. Please verify your email.");
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
          </>
        )}

        <p className="exp-auth-footer">
          Already have an account?{" "}
          <Link href="/login" aria-label="Go to sign in page" title="Sign in">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
