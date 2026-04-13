import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

const { cookies } = await import("next/headers")
const { fetchWithAuth, fetchWithAuthJson } = await import("./fetch-with-auth")

function makeCookies(accessToken?: string, refreshToken?: string) {
  return {
    get: (name: string) => {
      if (name === "access-token") return accessToken ? { value: accessToken } : undefined
      if (name === "refresh-token") return refreshToken ? { value: refreshToken } : undefined
      return undefined
    },
  }
}

describe("fetchWithAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should add Authorization header from access-token cookie", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("my-token") as never)

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    vi.stubGlobal("fetch", mockFetch)

    await fetchWithAuth("http://api/test", {})

    expect(mockFetch).toHaveBeenCalledWith(
      "http://api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      })
    )
  })

  it("should not add Authorization header when no token cookie exists", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies() as never)

    const mockFetch = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 })
    )
    vi.stubGlobal("fetch", mockFetch)

    await fetchWithAuth("http://api/test", {})

    const calledHeaders = mockFetch.mock.calls[0][1].headers
    expect(calledHeaders?.Authorization).toBeUndefined()
  })

  it("should merge existing headers with Authorization", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("my-token") as never)

    const mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    await fetchWithAuth("http://api/test", {
      headers: { "Content-Type": "application/json" },
    })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["Authorization"]).toBe("Bearer my-token")
  })

  it("should return the response directly on success", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("my-token") as never)

    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: 42 }), { status: 200 }))
    vi.stubGlobal("fetch", mockFetch)

    const res = await fetchWithAuth("http://api/test", {})
    expect(res.status).toBe(200)
  })
})

describe("fetchWithAuthJson", () => {
  beforeEach(() => vi.clearAllMocks())

  it("should return parsed JSON body and status on success", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ score: 85 }), { status: 200 }))
    )

    const result = await fetchWithAuthJson<{ score: number }>("http://api/test", {})

    expect(result.data).toEqual({ score: 85 })
    expect(result.status).toBe(200)
    expect(result.ok).toBe(true)
  })

  it("should return ok=false and data on non-2xx response", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      )
    )

    const result = await fetchWithAuthJson<{ error: string }>("http://api/test", {})

    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
    expect(result.data).toEqual({ error: "Unauthorized" })
  })
})
