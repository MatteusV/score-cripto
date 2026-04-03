import { describe, expect, it } from "vitest"
import { normalizeChainInput, parseAnalyzeSearchParams } from "./query"

describe("normalizeChainInput", () => {
  it("normalizes supported values", () => {
    expect(normalizeChainInput(" Polygon ")).toBe("polygon")
  })

  it("falls back to ethereum for unknown values", () => {
    expect(normalizeChainInput("solana")).toBe("ethereum")
  })
})

describe("parseAnalyzeSearchParams", () => {
  it("reads and trims chain and address", () => {
    expect(
      parseAnalyzeSearchParams({
        chain: ["Base", "Polygon"],
        address: [" 0xabc ", "0xignored"],
      }),
    ).toEqual({
      chain: "base",
      address: "0xabc",
    })
  })

  it("returns defaults when params are absent", () => {
    expect(parseAnalyzeSearchParams({})).toEqual({
      chain: "ethereum",
      address: "",
    })
  })
})
