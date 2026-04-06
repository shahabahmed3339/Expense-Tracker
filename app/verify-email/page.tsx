"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader } from "@/components/Loader";

function VerifyEmailClient({ token }: { token: string | null }) {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Verification token is missing.");
      return;
    }

    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? "Verification failed");
        }
        setState("success");
        setMessage("Your email has been verified. You can sign in now.");
      })
      .catch((error: Error) => {
        setState("error");
        setMessage(error.message);
      });
  }, [token]);

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
        <h1 className="exp-auth-title">Email verification</h1>
        <p className="exp-auth-sub">{message}</p>
        {state === "loading" ? <Loader /> : null}
        {state !== "loading" ? (
          <p className="exp-auth-footer">
            <Link href="/login" aria-label="Go to sign in page" title="Sign in">
              Go to sign in
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    void searchParams.then((params) => setToken(params.token ?? null));
  }, [searchParams]);

  return <VerifyEmailClient token={token} />;
}
