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
} as const;

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
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
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please try again later.",
    });
  }
}
