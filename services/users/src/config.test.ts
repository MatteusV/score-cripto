import { describe, expect, it } from "vitest";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3003),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_PRIVATE_KEY: z.string().min(1, "JWT_PRIVATE_KEY is required"),
  JWT_PUBLIC_KEY: z.string().min(1, "JWT_PUBLIC_KEY is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
});

const VALID_PEM_PRIVATE = "-----BEGIN PRIVATE KEY-----\nMIItest\n-----END PRIVATE KEY-----";
const VALID_PEM_PUBLIC = "-----BEGIN PUBLIC KEY-----\nMIItest\n-----END PUBLIC KEY-----";

describe("Config schema", () => {
  it("should reject when DATABASE_URL is missing", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "",
      JWT_PRIVATE_KEY: VALID_PEM_PRIVATE,
      JWT_PUBLIC_KEY: VALID_PEM_PUBLIC,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.DATABASE_URL).toBeDefined();
    }
  });

  it("should reject when JWT_PRIVATE_KEY is missing", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_PRIVATE_KEY: "",
      JWT_PUBLIC_KEY: VALID_PEM_PUBLIC,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.JWT_PRIVATE_KEY).toBeDefined();
    }
  });

  it("should reject when JWT_PUBLIC_KEY is missing", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_PRIVATE_KEY: VALID_PEM_PRIVATE,
      JWT_PUBLIC_KEY: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.JWT_PUBLIC_KEY).toBeDefined();
    }
  });

  it("should use default values when optional vars are not provided", () => {
    const result = envSchema.safeParse({
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_PRIVATE_KEY: VALID_PEM_PRIVATE,
      JWT_PUBLIC_KEY: VALID_PEM_PUBLIC,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3003);
      expect(result.data.JWT_EXPIRES_IN).toBe("15m");
      expect(result.data.REFRESH_TOKEN_EXPIRES_IN).toBe("7d");
      expect(result.data.RABBITMQ_URL).toBe("amqp://localhost:5672");
    }
  });

  it("should accept valid config with all values", () => {
    const result = envSchema.safeParse({
      PORT: 3005,
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_PRIVATE_KEY: VALID_PEM_PRIVATE,
      JWT_PUBLIC_KEY: VALID_PEM_PUBLIC,
      JWT_EXPIRES_IN: "30m",
      REFRESH_TOKEN_EXPIRES_IN: "14d",
      RABBITMQ_URL: "amqp://localhost:5672",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3005);
      expect(result.data.JWT_EXPIRES_IN).toBe("30m");
    }
  });
});
