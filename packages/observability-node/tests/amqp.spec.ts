import { describe, expect, it } from "vitest";
import type { Message } from "amqplib";
import {
  CORRELATION_HEADER,
  extractCorrelationId,
  injectCorrelationId,
} from "../src/amqp/headers.js";

function makeMsg(headers: Record<string, unknown>): Message {
  return {
    properties: { headers },
    content: Buffer.from(""),
    fields: {
      deliveryTag: 1,
      redelivered: false,
      exchange: "test",
      routingKey: "test.event",
      consumerTag: "",
    },
  } as unknown as Message;
}

describe("extractCorrelationId", () => {
  it("extracts a string header value", () => {
    const msg = makeMsg({ [CORRELATION_HEADER]: "corr-abc-123" });
    expect(extractCorrelationId(msg)).toBe("corr-abc-123");
  });

  it("extracts a Buffer header value (RabbitMQ delivery format)", () => {
    const msg = makeMsg({
      [CORRELATION_HEADER]: Buffer.from("corr-from-buffer"),
    });
    expect(extractCorrelationId(msg)).toBe("corr-from-buffer");
  });

  it("returns undefined when header is absent", () => {
    const msg = makeMsg({});
    expect(extractCorrelationId(msg)).toBeUndefined();
  });

  it("returns undefined when properties.headers is null", () => {
    const msg = makeMsg({});
    // @ts-expect-error testing edge case
    msg.properties.headers = null;
    expect(extractCorrelationId(msg)).toBeUndefined();
  });
});

describe("injectCorrelationId", () => {
  it("injects correlation header into empty headers", () => {
    const result = injectCorrelationId({}, "new-corr-id");
    expect(result[CORRELATION_HEADER]).toBe("new-corr-id");
  });

  it("preserves existing headers when injecting", () => {
    const result = injectCorrelationId({ "x-other": "value" }, "new-id");
    expect(result["x-other"]).toBe("value");
    expect(result[CORRELATION_HEADER]).toBe("new-id");
  });

  it("does not mutate the original headers object", () => {
    const original = { existing: "val" };
    injectCorrelationId(original, "id");
    expect(CORRELATION_HEADER in original).toBe(false);
  });
});
