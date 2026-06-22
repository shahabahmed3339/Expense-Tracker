import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "@/server/lib/logger";
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

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(options: RateLimitOptions) {
  const cacheKey = `${options.scope}:${options.limit}:${options.windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter && redis) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(options.limit, `${options.windowMs} ms`),
      prefix: `rl:${options.scope}`,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

export function createRateLimitKey(req: Request, suffix = "") {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const fallback = "anonymous";
  const identifier = forwardedFor || realIp || fallback;
  return suffix ? `${identifier}:${suffix}` : identifier;
}

function enforceInMemoryRateLimit(options: RateLimitOptions) {
  pruneExpiredBuckets();

  const now = Date.now();
  const bucketKey = `${options.scope}:${options.key ?? "default"}`;
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

export async function enforceRateLimit(req: Request, options: RateLimitOptions) {
  const key = options.key ?? createRateLimitKey(req);
  const limiter = getUpstashLimiter(options);

  if (!limiter) {
    return enforceInMemoryRateLimit({ ...options, key });
  }

  const result = await limiter.limit(`${options.scope}:${key}`);
  if (!result.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    logger.warn({ scope: options.scope, key }, "Rate limit exceeded");
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

  return null;
}

export async function checkUserMutationRateLimit(userId: string) {
  const limiter = getUpstashLimiter({
    scope: "trpc-mutation",
    limit: 60,
    windowMs: 60_000,
  });

  if (!limiter) {
    return true;
  }

  const result = await limiter.limit(`user:${userId}`);
  return result.success;
}

function pruneExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
