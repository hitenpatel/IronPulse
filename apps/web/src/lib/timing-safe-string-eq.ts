import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string equality. Both inputs are converted to Buffers of
 * equal length before comparison; unequal lengths return false without
 * leaking timing on the length difference itself (still leaks length,
 * which is unavoidable and not sensitive for shared secrets).
 */
export function timingSafeStringEq(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  if (ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}
