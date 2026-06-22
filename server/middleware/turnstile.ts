import { env } from "@/env";

export async function verifyTurnstileToken(token: string | undefined, ip?: string) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}
