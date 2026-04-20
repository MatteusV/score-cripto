import { createSign, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateRsaKeyPair } from "./generate-keys.js";

describe("generateRsaKeyPair", () => {
  it("should return a private key in PKCS8 PEM format", () => {
    const { privateKey } = generateRsaKeyPair();
    expect(privateKey).toContain("-----BEGIN PRIVATE KEY-----");
    expect(privateKey).toContain("-----END PRIVATE KEY-----");
  });

  it("should return a public key in SPKI PEM format", () => {
    const { publicKey } = generateRsaKeyPair();
    expect(publicKey).toContain("-----BEGIN PUBLIC KEY-----");
    expect(publicKey).toContain("-----END PUBLIC KEY-----");
  });

  it("should generate a valid 2048-bit RSA key pair (sign + verify)", () => {
    const { privateKey, publicKey } = generateRsaKeyPair();
    const data = "score-cripto-test-payload";

    const signature = createSign("SHA256").update(data).sign(privateKey);
    const valid = createVerify("SHA256").update(data).verify(publicKey, signature);

    expect(valid).toBe(true);
  });

  it("should produce different key pairs on each call", () => {
    const first = generateRsaKeyPair();
    const second = generateRsaKeyPair();
    expect(first.privateKey).not.toBe(second.privateKey);
    expect(first.publicKey).not.toBe(second.publicKey);
  });

  it("should not verify with mismatched key pair", () => {
    const { privateKey } = generateRsaKeyPair();
    const { publicKey: wrongPublicKey } = generateRsaKeyPair();
    const data = "score-cripto-test-payload";

    const signature = createSign("SHA256").update(data).sign(privateKey);
    const valid = createVerify("SHA256").update(data).verify(wrongPublicKey, signature);

    expect(valid).toBe(false);
  });
});
