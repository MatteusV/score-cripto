import { describe, expect, it } from "vitest";
import pino from "pino";
import { createLogger } from "../src/logger.js";

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
    const logger = createLogger({ service: "test-svc" });
    expect(logger.level).toBe("info");
    process.env.LOG_LEVEL = saved;
  });
});
