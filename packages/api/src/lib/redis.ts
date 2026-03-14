import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisInstance = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return redisInstance;
}
