import { describe, expect, it } from "vitest";
import pino from "pino";
import { createLogger, getLoggerOptions } from "../src/logger.js";

describe("createLogger", () => {
  it("creates a pino Logger instance", () => {
    const logger = createLogger({ service: "test-service" });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("respects LOG_LEVEL env variable", () => {
    process.env.LOG_LEVEL = "warn";
    const logger = createLogger({ service: "test-svc" });
    expect(logger.level).toBe("warn");
    delete process.env.LOG_LEVEL;
  });

  it("accepts explicit level override", () => {
    const logger = createLogger({ service: "test-svc", level: "debug" });
    expect(logger.level).toBe("debug");
  });

  it("defaults to info level when LOG_LEVEL is unset", () => {
    const saved = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    try {
      const logger = createLogger({ service: "test-svc" });
      expect(logger.level).toBe("info");
    } finally {
      if (saved === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = saved;
      }
    }
  });
});

function captureLog(obj: unknown): Record<string, unknown> {
  const lines: string[] = [];
  const stream = {
    write(msg: string) {
      lines.push(msg);
    },
  };
  const logger = pino(
    getLoggerOptions({ service: "redact-test", level: "info" }),
    stream
  );
  logger.info(obj);
  return JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
}

describe("getLoggerOptions redact", () => {
  it("redacts Authorization header from req", () => {
    const out = captureLog({
      req: { headers: { authorization: "Bearer secret-token-xyz" } },
    });
    expect((out.req as { headers: { authorization: string } }).headers.authorization).toBe(
      "[REDACTED]"
    );
  });

  it("redacts Cookie header from req", () => {
    const out = captureLog({
      req: { headers: { cookie: "session=abc123; token=def456" } },
    });
    expect((out.req as { headers: { cookie: string } }).headers.cookie).toBe(
      "[REDACTED]"
    );
  });

  it("redacts Set-Cookie header from res", () => {
    const out = captureLog({
      res: { headers: { "set-cookie": "session=xyz; HttpOnly" } },
    });
    expect((out.res as { headers: Record<string, string> }).headers["set-cookie"]).toBe(
      "[REDACTED]"
    );
  });

  it("redacts password in body and preserves non-sensitive fields", () => {
    const out = captureLog({
      body: { email: "alice@example.com", password: "hunter2" },
    });
    const body = out.body as { email: string; password: string };
    expect(body.password).toBe("[REDACTED]");
    expect(body.email).toBe("alice@example.com");
  });

  it("redacts token/accessToken/refreshToken at nested depths via wildcard", () => {
    const out = captureLog({
      auth: { accessToken: "eyJhbGciOi...", refreshToken: "rtk_abc" },
      meta: { token: "inner" },
    });
    const auth = out.auth as { accessToken: string; refreshToken: string };
    const meta = out.meta as { token: string };
    expect(auth.accessToken).toBe("[REDACTED]");
    expect(auth.refreshToken).toBe("[REDACTED]");
    expect(meta.token).toBe("[REDACTED]");
  });

  it("redacts apiKey, secret, clientSecret, privateKey", () => {
    const out = captureLog({
      stripe: { apiKey: "sk_live_xxx", clientSecret: "whsec_xxx" },
      crypto: { privateKey: "-----BEGIN RSA-----" },
      misc: { secret: "shhh" },
    });
    const stripe = out.stripe as { apiKey: string; clientSecret: string };
    const crypto = out.crypto as { privateKey: string };
    const misc = out.misc as { secret: string };
    expect(stripe.apiKey).toBe("[REDACTED]");
    expect(stripe.clientSecret).toBe("[REDACTED]");
    expect(crypto.privateKey).toBe("[REDACTED]");
    expect(misc.secret).toBe("[REDACTED]");
  });

  it("does not touch non-sensitive fields", () => {
    const out = captureLog({
      chain: "ethereum",
      address: "0xabc",
      score: 42,
    });
    expect(out.chain).toBe("ethereum");
    expect(out.address).toBe("0xabc");
    expect(out.score).toBe(42);
  });
});
