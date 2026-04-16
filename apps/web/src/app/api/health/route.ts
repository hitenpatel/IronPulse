import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
}

async function checkService(
  name: string,
  fn: () => Promise<void>,
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await fn();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkService("db", async () => {
      const { db } = await import("@ironpulse/db");
      await db.$queryRaw`SELECT 1`;
    }),
    checkService("redis", async () => {
      const { getRedis } = await import("@ironpulse/api/src/lib/redis");
      const redis = getRedis();
      await redis.ping();
    }),
    checkService("s3", async () => {
      const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
      const resp = await fetch(`${endpoint}/minio/health/live`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    }),
  ]);

  const [db, redis, s3] = checks;
  const allOk = checks.every((c) => c.status === "ok");

  const body = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    services: { db, redis, s3 },
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
