import { TRPCError } from "@trpc/server";
import { getRedis } from "./redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  api: { windowMs: 60_000, maxRequests: 100 },
  upload: { windowMs: 3_600_000, maxRequests: 10 },
  auth: { windowMs: 60_000, maxRequests: 5 },
  passkeyReg: { windowMs: 3_600_000, maxRequests: 5 },
} as const;

/**
 * Thrown when a rate limit is exceeded. Carries the limit config so the
 * response adapter can emit Retry-After and X-RateLimit-* headers.
 */
export class RateLimitError extends TRPCError {
  public readonly retryAfterSeconds: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(opts: { windowMs: number; maxRequests: number; current: number }) {
    super({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please try again later.",
    });
    this.name = "RateLimitError";
    this.retryAfterSeconds = Math.ceil(opts.windowMs / 1000);
    this.limit = opts.maxRequests;
    this.remaining = Math.max(0, opts.maxRequests - opts.current);
  }
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ limit: number; remaining: number; windowMs: number }> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const redisKey = `ratelimit:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
  pipeline.zcard(redisKey);
  pipeline.pexpire(redisKey, config.windowMs);

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number;

  if (count > config.maxRequests) {
    throw new RateLimitError({
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      current: count,
    });
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    windowMs: config.windowMs,
  };
}
