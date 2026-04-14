import type { ConsumeMessage } from "amqplib";
import { describe, expect, it } from "vitest";
import {
  computeBackoffMs,
  getRetryCount,
  MAX_RETRIES,
} from "./retry-topology.js";

function makeMsg(retryCount?: number): ConsumeMessage {
  return {
    content: Buffer.from("{}"),
    fields: {} as ConsumeMessage["fields"],
    properties: {
      headers: retryCount === undefined ? {} : { "x-retry-count": retryCount },
    } as ConsumeMessage["properties"],
  } as unknown as ConsumeMessage;
}

describe("computeBackoffMs", () => {
  it("retry 0 está entre 900ms e 1100ms", () => {
    for (let i = 0; i < 20; i++) {
      const result = computeBackoffMs(0);
      expect(result).toBeGreaterThanOrEqual(900);
      expect(result).toBeLessThanOrEqual(1100);
    }
  });

  it("retry 1 está entre 1800ms e 2200ms", () => {
    for (let i = 0; i < 20; i++) {
      const result = computeBackoffMs(1);
      expect(result).toBeGreaterThanOrEqual(1800);
      expect(result).toBeLessThanOrEqual(2200);
    }
  });

  it("retry 2 está entre 3600ms e 4400ms", () => {
    for (let i = 0; i < 20; i++) {
      const result = computeBackoffMs(2);
      expect(result).toBeGreaterThanOrEqual(3600);
      expect(result).toBeLessThanOrEqual(4400);
    }
  });
});

describe("getRetryCount", () => {
  it("retorna 0 quando header está ausente", () => {
    const msg = makeMsg();
    expect(getRetryCount(msg)).toBe(0);
  });

  it("retorna 0 quando header x-retry-count é undefined", () => {
    expect(getRetryCount(makeMsg(undefined))).toBe(0);
  });

  it("retorna o valor quando x-retry-count é número", () => {
    expect(getRetryCount(makeMsg(2))).toBe(2);
  });

  it("retorna 0 quando x-retry-count não é número", () => {
    const msg = {
      properties: { headers: { "x-retry-count": "not-a-number" } },
    } as unknown as ConsumeMessage;
    expect(getRetryCount(msg)).toBe(0);
  });
});

describe("MAX_RETRIES", () => {
  it("é 3", () => {
    expect(MAX_RETRIES).toBe(3);
  });
});
