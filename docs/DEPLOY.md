# Production Deployment Runbook

Deploy Expense Tracker to **Vercel + Neon Postgres + Upstash Redis + Resend**.

## Prerequisites

1. **Neon** — Create a project, copy the **pooled** connection string (`?pgbouncer=true`).
2. **Upstash Redis** — Create a database, copy REST URL and token.
3. **Resend** — Verify your domain, copy API key.
4. **Sentry** (optional) — Create a Next.js project, copy DSN.
5. **Cloudflare Turnstile** (optional) — Site key + secret for bot protection.

## Environment Variables

Set in Vercel (Production + Preview):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon pooled URL |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | `https://your-domain.com` |
| `RESEND_API_KEY` | Yes (prod) | Or full SMTP config |
| `EMAIL_FROM` | Yes (prod) | Verified sender |
| `UPSTASH_REDIS_REST_URL` | Yes (prod) | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (prod) | Rate limiting |
| `CRON_SECRET` | Yes (prod) | Random 32+ char string |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Profile avatars |
| `TURNSTILE_SECRET_KEY` | Optional | Bot protection |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Bot protection |
| `SENTRY_DSN` | Optional | Error tracking |

## Deploy Steps

1. Link repo to Vercel.
2. Set all environment variables.
3. On first deploy, run migrations against production Neon:

```bash
DATABASE_URL="your-neon-url" npm run db:migrate:deploy
```

4. Verify health check: `GET /api/health` → `{ "status": "ok", "db": "ok" }`.
5. Test signup email delivery and protected route redirect.
6. Enable Neon automated backups.

## CI/CD

GitHub Actions runs on every PR: lint, typecheck, test, build, `prisma validate`.

On merge to `main`, Vercel auto-deploys. Run `prisma migrate deploy` in CI before deploy (see `.github/workflows/deploy.yml`).

## Staging

- Vercel Preview deployments per PR.
- Use a Neon branch or separate staging database for preview env vars.

## Rollback

- Vercel: redeploy previous deployment from dashboard.
- Database: restore from Neon backup (point-in-time recovery).

## Monitoring

- Uptime: monitor `GET /api/health`.
- Errors: Sentry dashboard.
- Logs: Vercel function logs + structured JSON from pino.
