import { describe, expect, it } from "vitest";
import { normalizeChainInput, parseAnalyzeSearchParams } from "./query";

describe("normalizeChainInput", () => {
  it("normalizes supported values", () => {
    expect(normalizeChainInput(" Polygon ")).toBe("polygon");
  });

  it("falls back to ethereum for unknown values", () => {
    expect(normalizeChainInput("solana")).toBe("ethereum");
  });
});

describe("parseAnalyzeSearchParams", () => {
  it("reads and trims chain and address in new mode", () => {
    expect(
      parseAnalyzeSearchParams({
        chain: ["Base", "Polygon"],
        address: [" 0xabc ", "0xignored"],
      })
    ).toEqual({
      mode: "new",
      chain: "base",
      address: "0xabc",
    });
  });

  it("returns defaults when params are absent", () => {
    expect(parseAnalyzeSearchParams({})).toEqual({
      mode: "new",
      chain: "ethereum",
      address: "",
    });
  });

  it("returns history mode when id param is a valid integer", () => {
    expect(parseAnalyzeSearchParams({ id: "42" })).toEqual({
      mode: "history",
      publicId: 42,
    });
  });

  it("falls back to new mode when id is not a valid integer", () => {
    const result = parseAnalyzeSearchParams({
      id: "abc",
      chain: "ethereum",
      address: "0xabc",
    });
    expect(result).toEqual({
      mode: "new",
      chain: "ethereum",
      address: "0xabc",
    });
  });
});
