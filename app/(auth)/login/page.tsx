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
  const [otpCode, setOtpCode] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otpMaskedEmail, setOtpMaskedEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);

  useEffect(() => {
    console.log(status)
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const nextSeconds = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      setOtpSecondsLeft(nextSeconds);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="exp-auth-root">
        <div className="exp-auth-loading">
          <Loader />
        </div>
      </div>
    );
  }

  const startLogin = async () => {
    setPending(true);
    setUnverifiedEmail("");

    try {
      const response = await fetch("/api/auth/login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (body.requiresVerification) {
          setUnverifiedEmail(email.trim().toLowerCase());
        }
        toast.error(body.error ?? "Unable to sign in");
        return;
      }

      if (body.requiresOtp) {
        setRequiresOtp(true);
        setOtpChallengeId(body.challengeId);
        setOtpMaskedEmail(body.maskedEmail);
        setOtpExpiresAt(body.expiresAt ? new Date(body.expiresAt).getTime() : Date.now() + 2 * 60 * 1000);
        setOtpCode("");
        toast.success("OTP sent to your email");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
        return;
      }
      router.replace("/dashboard");
    } catch {
      toast.error("Network error");
    } finally {
      setPending(false);
    }
  };

  const verifyOtpAndLogin = async () => {
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        challengeId: otpChallengeId,
        otpCode: otpCode.trim(),
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid or expired OTP");
        return;
      }
      router.replace("/dashboard");
    } finally {
      setPending(false);
    }
  };

  const resendVerification = async () => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Unable to resend verification");
        return;
      }
      toast.success("Verification email resent");
    } catch {
      toast.error("Network error");
    }
  };

  const resendOtp = async () => {
    setResending(true);
    try {
      const response = await fetch("/api/auth/login/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: otpChallengeId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Unable to resend OTP");
        return;
      }
      setOtpMaskedEmail(body.maskedEmail);
      setOtpExpiresAt(body.expiresAt ? new Date(body.expiresAt).getTime() : Date.now() + 2 * 60 * 1000);
      toast.success("OTP resent");
    } catch {
      toast.error("Network error");
    } finally {
      setResending(false);
    }
  };

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
        <h1 className="exp-auth-title">{requiresOtp ? "Enter login code" : "Sign in"}</h1>
        <p className="exp-auth-sub">
          {requiresOtp ? `We sent a 6-digit code to ${otpMaskedEmail}.` : "Use your email and password to continue."}
        </p>

        {unverifiedEmail ? (
          <div className="exp-auth-notice">
            <p className="exp-auth-helper">Your email is not verified yet.</p>
            <button type="button" className="exp-auth-secondary" onClick={resendVerification} aria-label="Resend verification email" title="Resend verification email">
              Resend verification email
            </button>
          </div>
        ) : null}

        {!requiresOtp ? (
          <>
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
              <div className="exp-auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="exp-auth-input exp-auth-input-with-action"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="........"
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
            </div>

            <div className="exp-auth-actions">
              <button
                type="button"
                disabled={pending}
                className="exp-auth-primary"
                aria-label={pending ? "Signing in with email" : "Sign in with email"}
                title={pending ? "Signing in..." : "Sign in with email"}
                onClick={startLogin}
              >
                {pending ? "Signing in..." : "Continue"}
              </button>
              {!!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <button
                  type="button"
                  className="exp-auth-secondary"
                  aria-label="Continue with Google"
                  title="Continue with Google"
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                >
                  Continue with Google
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="exp-auth-field">
              <label className="exp-auth-label" htmlFor="login-otp">
                Login OTP
              </label>
              <input
                id="login-otp"
                inputMode="numeric"
                maxLength={6}
                className="exp-auth-input"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
              />
              <p className="exp-auth-helper">
                Use the code from your email. Time remaining: {formatOtpTime(otpSecondsLeft)}.
              </p>
            </div>

            <div className="exp-auth-actions">
              <button
                type="button"
                disabled={pending || otpCode.length !== 6}
                className="exp-auth-primary"
                aria-label={pending ? "Verifying OTP" : "Verify OTP and sign in"}
                title={pending ? "Verifying..." : "Verify OTP and sign in"}
                onClick={verifyOtpAndLogin}
              >
                {pending ? "Verifying..." : "Verify and sign in"}
              </button>
              <button
                type="button"
                className="exp-auth-secondary"
                disabled={resending || otpSecondsLeft > 0}
                onClick={resendOtp}
                aria-label="Resend OTP"
                title="Resend OTP"
              >
                {resending ? "Resending..." : otpSecondsLeft > 0 ? `Resend in ${formatOtpTime(otpSecondsLeft)}` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="exp-auth-secondary"
                onClick={() => {
                  setRequiresOtp(false);
                  setOtpCode("");
                  setOtpChallengeId("");
                  setOtpExpiresAt(null);
                }}
                aria-label="Back to password sign in"
                title="Back"
              >
                Back
              </button>
            </div>
          </>
        )}

        <p className="exp-auth-footer">
          No account?{" "}
          <Link href="/signup" aria-label="Go to sign up page" title="Sign up">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function formatOtpTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
