import { describe, expect, it } from "vitest";
import { generateRsaKeyPair } from "../scripts/generate-keys.js";
import { JwtServiceImpl } from "./jwt-service.js";

function makeService(overrides?: { privateKey?: string; publicKey?: string }) {
  const { privateKey, publicKey } = generateRsaKeyPair();
  return new JwtServiceImpl(
    overrides?.privateKey ?? privateKey,
    overrides?.publicKey ?? publicKey,
    "15m"
  );
}

describe("JwtServiceImpl (RS256)", () => {
  it("should sign a token with RS256 algorithm", () => {
    const svc = makeService();
    const token = svc.sign({ sub: "user-123", email: "alice@example.com" });

    const [, payloadB64] = token.split(".");
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString()
    );
    expect(header.alg).toBe("RS256");
    expect(payloadB64).toBeTruthy();
  });

  it("should verify a token signed with the matching private key", () => {
    const svc = makeService();
    const token = svc.sign({ sub: "user-123", email: "alice@example.com" });
    const payload = svc.verify(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("alice@example.com");
  });

  it("should throw when verifying with a mismatched public key", () => {
    const { privateKey } = generateRsaKeyPair();
    const { publicKey: wrongPublicKey } = generateRsaKeyPair();
    const svc = new JwtServiceImpl(privateKey, wrongPublicKey, "15m");

    const token = svc.sign({ sub: "user-123", email: "alice@example.com" });

    expect(() => svc.verify(token)).toThrow();
  });

  it("should throw on a tampered token", () => {
    const svc = makeService();
    const token = svc.sign({ sub: "user-123", email: "alice@example.com" });
    const tampered = token.slice(0, -5) + "xxxxx";

    expect(() => svc.verify(tampered)).toThrow();
  });

  it("should throw on an expired token", async () => {
    const { privateKey, publicKey } = generateRsaKeyPair();
    const svc = new JwtServiceImpl(privateKey, publicKey, "1ms");

    const token = svc.sign({ sub: "user-123", email: "alice@example.com" });
    await new Promise((r) => setTimeout(r, 50));

    expect(() => svc.verify(token)).toThrow();
  });
});
