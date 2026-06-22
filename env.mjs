import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RESEND_API_KEY: z.string().min(1).optional(),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    SMTP_SECURE: z.enum(["true", "false"]).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    EMAIL_PROVIDER: z.enum(["resend", "smtp", "auto"]).default("auto"),
    UPSTASH_REDIS_REST_URL: isProduction ? z.string().url() : z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: isProduction ? z.string().min(1) : z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    SENTRY_DSN: z.string().url().optional(),
    CRON_SECRET: z.string().min(16).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_ID: z.string().min(1).optional(),
    GOOGLE_SECRET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default("Expense Tracker"),
    NEXT_PUBLIC_APP_HOST: z.string().default("localhost"),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    CRON_SECRET: process.env.CRON_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_ID: process.env.GOOGLE_ID,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_HOST: process.env.NEXT_PUBLIC_APP_HOST,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});

if (isProduction) {
  const hasResend = !!env.RESEND_API_KEY;
  const hasSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
  if (!hasResend && !hasSmtp) {
    throw new Error("Production requires RESEND_API_KEY or full SMTP configuration.");
  }
}
