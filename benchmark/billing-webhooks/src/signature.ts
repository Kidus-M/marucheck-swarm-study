import { createHmac, timingSafeEqual } from "node:crypto";

/** Events older than this are refused, so a captured request cannot be replayed later. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${String(timestamp)}.${body}`).digest("hex");
}

export function verifySignature(
  secret: string,
  timestamp: number,
  body: string,
  signature: string,
  nowSeconds: number,
): boolean {
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(signPayload(secret, timestamp, body), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
