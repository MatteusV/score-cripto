import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";

// Par RSA dedicado para este spec
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Mock config antes do import do middleware
vi.mock("../../config.js", () => ({
  config: { jwtPublicKey: publicKey },
}));

const { authenticate } = await import("./authenticate.js");

function makeRequest(authHeader?: string) {
  return {
    headers: { authorization: authHeader },
    user: undefined as unknown,
  } as Parameters<typeof authenticate>[0];
}

function makeReply() {
  const reply = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    send(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return reply as unknown as Parameters<typeof authenticate>[1];
}

function signToken(payload: { sub: string; email: string }, pk = privateKey) {
  return jwt.sign(payload, pk, { algorithm: "RS256", expiresIn: "15m" });
}

describe("authenticate middleware (RS256)", () => {
  it("should set request.user from a valid RS256 token", async () => {
    const token = signToken({ sub: "user-abc", email: "alice@example.com" });
    const req = makeRequest(`Bearer ${token}`);
    const reply = makeReply();

    await authenticate(req, reply);

    expect((req as { user: { id: string; email: string } }).user).toEqual({
      id: "user-abc",
      email: "alice@example.com",
    });
  });

  it("should return 401 when Authorization header is missing", async () => {
    const req = makeRequest(undefined);
    const reply = makeReply();

    await authenticate(req, reply);

    expect(reply._status).toBe(401);
    expect((reply._body as { error: string }).error).toContain("Missing");
  });

  it("should return 401 when scheme is not Bearer", async () => {
    const req = makeRequest("Basic dXNlcjpwYXNz");
    const reply = makeReply();

    await authenticate(req, reply);

    expect(reply._status).toBe(401);
  });

  it("should return 401 for a token signed with wrong private key", async () => {
    const { privateKey: wrongKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const token = signToken(
      { sub: "user-abc", email: "alice@example.com" },
      wrongKey
    );
    const req = makeRequest(`Bearer ${token}`);
    const reply = makeReply();

    await authenticate(req, reply);

    expect(reply._status).toBe(401);
    expect((reply._body as { error: string }).error).toContain("Invalid");
  });

  it("should return 401 for an expired token", async () => {
    const token = jwt.sign(
      { sub: "user-abc", email: "alice@example.com" },
      privateKey,
      { algorithm: "RS256", expiresIn: "1ms" }
    );
    await new Promise((r) => setTimeout(r, 50));

    const req = makeRequest(`Bearer ${token}`);
    const reply = makeReply();

    await authenticate(req, reply);

    expect(reply._status).toBe(401);
    expect((reply._body as { error: string }).error).toContain("Invalid");
  });

  it("should return 401 for a tampered token", async () => {
    const token = signToken({ sub: "user-abc", email: "alice@example.com" });
    const tampered = `${token.slice(0, -5)}xxxxx`;
    const req = makeRequest(`Bearer ${tampered}`);
    const reply = makeReply();

    await authenticate(req, reply);

    expect(reply._status).toBe(401);
  });
});
