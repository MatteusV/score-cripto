import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger";

describe("createLogger", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {
      // silence console during tests
    });
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence console during tests
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // silence console during tests
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("should call console.info with structured JSON for info level", () => {
    const logger = createLogger("api/analyze");
    logger.info("request started", { chain: "ethereum" });

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const arg = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
    expect(arg.level).toBe("info");
    expect(arg.route).toBe("api/analyze");
    expect(arg.message).toBe("request started");
    expect(arg.chain).toBe("ethereum");
    expect(arg.timestamp).toBeDefined();
  });

  it("should call console.warn for warn level", () => {
    const logger = createLogger("api/history");
    logger.warn("upstream returned 404", { status: 404 });

    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    const arg = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
    expect(arg.level).toBe("warn");
    expect(arg.status).toBe(404);
  });

  it("should call console.error for error level and include error stack when given an Error", () => {
    const logger = createLogger("api/analyze");
    const err = new Error("Network failure");
    logger.error("upstream unreachable", { upstream: "http://api:3001" }, err);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const arg = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(arg.level).toBe("error");
    expect(arg.errorMessage).toBe("Network failure");
    expect(arg.errorStack).toBeDefined();
  });

  it("should call console.error for error level without Error object", () => {
    const logger = createLogger("api/history");
    logger.error("something went wrong", { userId: "u1" });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const arg = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(arg.level).toBe("error");
    expect(arg.message).toBe("something went wrong");
    expect(arg.errorMessage).toBeUndefined();
  });

  it("should include timestamp as ISO string", () => {
    const logger = createLogger("api/test");
    const before = Date.now();
    logger.info("ping");
    const after = Date.now();

    const arg = JSON.parse(consoleInfoSpy.mock.calls[0][0] as string);
    const ts = new Date(arg.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
