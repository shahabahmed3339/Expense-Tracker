import { NextResponse } from "next/server";
import { RATE_LIMIT_MESSAGES } from "@/server/config/rateLimit";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  key?: string;
  message?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = globalThis as typeof globalThis & {
  __expenseTrackerRateLimitStore?: Map<string, RateLimitBucket>;
};

const buckets = rateLimitStore.__expenseTrackerRateLimitStore ?? new Map<string, RateLimitBucket>();
rateLimitStore.__expenseTrackerRateLimitStore = buckets;

export function createRateLimitKey(req: Request, suffix = "") {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const fallback = "anonymous";
  const identifier = forwardedFor || realIp || fallback;
  return suffix ? `${identifier}:${suffix}` : identifier;
}

export function enforceRateLimit(req: Request, options: RateLimitOptions) {
  pruneExpiredBuckets();

  const now = Date.now();
  const bucketKey = `${options.scope}:${options.key ?? createRateLimitKey(req)}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        error: options.message ?? RATE_LIMIT_MESSAGES.tooManyRequests,
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return null;
}

function pruneExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
