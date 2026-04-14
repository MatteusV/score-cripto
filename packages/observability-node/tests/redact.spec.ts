import { describe, expect, it } from "vitest";
import { hashUserId, maskAddress } from "../src/redact.js";

describe("maskAddress", () => {
  it("masks ethereum address preserving first 6 and last 4 chars", () => {
    expect(maskAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
  });

  it("masks bitcoin-style address", () => {
    expect(maskAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf")).toBe(
      "1A1zP1…Divf",
    );
  });

  it("returns short addresses unchanged", () => {
    expect(maskAddress("short")).toBe("short");
  });

  it("handles exactly 12-char address", () => {
    const addr = "123456789012";
    expect(maskAddress(addr)).toBe("123456…9012");
  });
});

describe("hashUserId", () => {
  it("returns exactly 12 hex characters", () => {
    const hash = hashUserId("user-uuid-1234");
    expect(hash).toHaveLength(12);
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashUserId("same-input")).toBe(hashUserId("same-input"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashUserId("user-1")).not.toBe(hashUserId("user-2"));
  });
});
