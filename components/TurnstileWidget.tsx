"use client";

import Script from "next/script";
import { useEffect } from "react";

export function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) onVerify(detail);
    };
    window.addEventListener("turnstile-verify", handler);
    return () => window.removeEventListener("turnstile-verify", handler);
  }, [onVerify, siteKey]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-callback="onTurnstileVerify"
      />
      <Script id="turnstile-callback" strategy="lazyOnload">
        {`window.onTurnstileVerify = function(token) {
          window.dispatchEvent(new CustomEvent('turnstile-verify', { detail: token }));
        };`}
      </Script>
    </>
  );
}
