import { createHash } from "node:crypto";

function canonicalize(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => canonicalize(x) ?? null);
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src).sort()) {
    const c = canonicalize(src[k]);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)))
    .digest("hex");
}
