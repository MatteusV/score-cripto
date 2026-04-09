import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  startAnalysis: vi.fn(),
  pollAnalysis: vi.fn(),
}))

import { pollAnalysis, startAnalysis } from "@/lib/api"
import { useWalletScore } from "./use-wallet-score"

const mockStart = vi.mocked(startAnalysis)
const mockPoll = vi.mocked(pollAnalysis)

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useWalletScore", () => {
  it("starts in idle phase", () => {
    const { result } = renderHook(() =>
      useWalletScore("ethereum", "0xabc"),
    )

    expect(result.current.phase).toBe("idle")
    expect(result.current.processId).toBeNull()
    expect(result.current.result).toBeNull()
  })

  it("transitions through submitting → polling → completed", async () => {
    mockStart.mockResolvedValueOnce({ processId: "proc-1" })
    mockPoll.mockResolvedValueOnce({
      status: "completed",
      processId: "proc-1",
      chain: "ethereum",
      address: "0xabc",
      result: {
        score: 85,
        confidence: 0.95,
        reasoning: "Carteira segura.",
        positiveFactors: ["Historico longo"],
        riskFactors: [],
        modelVersion: "v1",
        promptVersion: "v1",
      },
    })

    const { result } = renderHook(() =>
      useWalletScore("ethereum", "0xabc"),
    )

    await act(async () => {
      await result.current.submit()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe("completed")
    })

    expect(result.current.processId).toBe("proc-1")
    expect(result.current.result?.score).toBe(85)
  })

  it("sets error phase when startAnalysis fails", async () => {
    mockStart.mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() =>
      useWalletScore("ethereum", "0xabc"),
    )

    await act(async () => {
      await result.current.submit()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe("error")
      expect(result.current.error).toBe("Network error")
    })
  })

  it("sets error phase when backend returns error status", async () => {
    mockStart.mockResolvedValueOnce({ processId: "proc-err" })
    mockPoll.mockResolvedValueOnce({
      status: "failed",
      processId: "proc-err",
      chain: "ethereum",
      address: "0xabc",
      error: "Chain nao suportada",
    })

    const { result } = renderHook(() =>
      useWalletScore("ethereum", "0xabc"),
    )

    await act(async () => {
      await result.current.submit()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe("error")
      expect(result.current.error).toBe("Chain nao suportada")
    })
  })

  it("resets back to idle", async () => {
    mockStart.mockResolvedValueOnce({ processId: "proc-r" })
    mockPoll.mockResolvedValueOnce({
      status: "completed",
      processId: "proc-r",
      chain: "ethereum",
      address: "0xabc",
      result: {
        score: 50,
        confidence: 0.8,
        reasoning: "Ok.",
        positiveFactors: [],
        riskFactors: [],
        modelVersion: "v1",
        promptVersion: "v1",
      },
    })

    const { result } = renderHook(() =>
      useWalletScore("ethereum", "0xabc"),
    )

    await act(async () => {
      await result.current.submit()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe("completed")
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.phase).toBe("idle")
    expect(result.current.result).toBeNull()
  })
})
