import { createHash } from "node:crypto";

const LONG_ADDRESS_PATTERN = /^.{12,}$/;

/**
 * Masks a blockchain address for safe logging at INFO level.
 * e.g. "0x1234567890abcdef1234" → "0x1234…cdef"
 */
export function maskAddress(address: string): string {
  if (!LONG_ADDRESS_PATTERN.test(address)) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Returns a 12-char deterministic hash of a userId for safe logging.
 * Never reversible to the original value.
 */
export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}
