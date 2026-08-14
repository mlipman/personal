import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export function verifyPassword(candidate: string): boolean {
  const configured = process.env.SIMPLE_LOG_PASSWORD;
  if (!configured) throw new Error("SIMPLE_LOG_PASSWORD is required");
  if (candidate.length > 1_024) return false;

  return timingSafeEqual(digest(candidate), digest(configured));
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
