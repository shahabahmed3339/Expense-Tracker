"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { use } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader } from "@/components/Loader";
import { APP_CONFIG } from "@/lib/config/runtime";

function VerifyEmailClient({ token }: { token: string | null | undefined }) {
  const [result, setResult] = useState<{ state: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
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
        setResult({
          state: "success",
          message: "Your email has been verified. You can sign in now.",
        });
      })
      .catch((error: Error) => {
        setResult({ state: "error", message: error.message });
      });
  }, [token]);

  const state = token === undefined ? "loading" : !token ? "error" : result?.state ?? "loading";
  const message =
    token === undefined
      ? "Verifying your email..."
      : !token
        ? "Verification token is missing."
        : result?.message ?? "Verifying your email...";

  return (
    <div className="exp-auth-root">
      <div className="exp-auth-brand">
        <div className="exp-auth-brand-row">
          <Image
            src="/Logo.PNG"
            alt={`${APP_CONFIG.name} logo`}
            width={44}
            height={44}
            className="exp-auth-logo"
            priority
          />
          <ThemeToggle size="sm" />
        </div>
        <div className="exp-auth-brand-name">{APP_CONFIG.name}</div>
      </div>

      <div className="exp-auth-card">
        <h1 className="exp-auth-title">Email verification</h1>
        <p className="exp-auth-sub">{message}</p>
        {state === "loading" ? (
          <div className="exp-auth-loading">
            <Loader />
          </div>
        ) : (
          <div className="exp-auth-actions">
            <Link className="exp-auth-primary" href="/login" aria-label="Go to sign in page" title="Sign in">
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? null;

  return <VerifyEmailClient token={token} />;
}
