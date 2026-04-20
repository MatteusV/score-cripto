import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))
vi.mock("@/lib/fetch-with-auth", () => ({ fetchWithAuthJson: vi.fn() }))

const { cookies } = await import("next/headers")
const { fetchWithAuthJson } = await import("@/lib/fetch-with-auth")
const { GET } = await import("./route")

function makeCookies(token?: string) {
  return {
    get: (name: string) =>
      name === "access-token" && token ? { value: token } : undefined,
  }
}

const MOCK_DELTA_RESPONSE = {
  window: {
    days: 3,
    current: { from: "2026-04-16T12:00:00.000Z", to: "2026-04-19T12:00:00.000Z" },
    previous: { from: "2026-04-13T12:00:00.000Z", to: "2026-04-16T12:00:00.000Z" },
  },
  current: { total: 5, avgScore: 72, trusted: 3, attention: 1, risky: 1 },
  previous: { total: 3, avgScore: 65, trusted: 1, attention: 2, risky: 0 },
  delta: { total: 2, avgScore: 7, trusted: 2, attention: -1, risky: 1 },
}

describe("GET /api/analysis-delta", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it("returns 401 when no access-token cookie", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies() as never)

    const req = new Request("http://localhost/api/analysis-delta")
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it("forwards default days=3 when no query param is given", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_DELTA_RESPONSE,
    })

    const req = new Request("http://localhost/api/analysis-delta")
    await GET(req)

    const calledUrl = vi.mocked(fetchWithAuthJson).mock.calls[0][0] as string
    expect(calledUrl).toContain("/analysis/delta?days=3")
  })

  it("forwards custom days param to api-gateway", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_DELTA_RESPONSE,
    })

    const req = new Request("http://localhost/api/analysis-delta?days=30")
    await GET(req)

    const calledUrl = vi.mocked(fetchWithAuthJson).mock.calls[0][0] as string
    expect(calledUrl).toContain("days=30")
  })

  it("returns the upstream payload verbatim on 200", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_DELTA_RESPONSE,
    })

    const req = new Request("http://localhost/api/analysis-delta")
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(MOCK_DELTA_RESPONSE)
  })

  it("propagates non-2xx status from api-gateway", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never)
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: false,
      status: 503,
      data: { error: "Service unavailable" },
    })

    const req = new Request("http://localhost/api/analysis-delta")
    const res = await GET(req)

    expect(res.status).toBe(503)
  })
})
