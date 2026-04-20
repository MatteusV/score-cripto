import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/fetch-with-auth", () => ({ fetchWithAuthJson: vi.fn() }));

const { cookies } = await import("next/headers");
const { fetchWithAuthJson } = await import("@/lib/fetch-with-auth");
const { GET } = await import("./route");

function makeCookies(token?: string) {
  return {
    get: (name: string) =>
      name === "access-token" && token ? { value: token } : undefined,
  };
}

const MOCK_HISTORY_RESPONSE = {
  summary: { total: 3, avgScore: 70, trusted: 2, attention: 1, risky: 0 },
  data: [
    {
      id: "r1",
      chain: "ethereum",
      address: "0xabc",
      score: 85,
      requestedAt: "2026-04-13T10:00:00Z",
      completedAt: "2026-04-13T10:01:00Z",
    },
  ],
  pagination: { page: 1, limit: 20, total: 3 },
};

describe("GET /api/history", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("should return 401 when no access-token cookie", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies() as never);

    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("should call fetchWithAuthJson with api-gateway URL and return the response", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("my-token") as never);
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_HISTORY_RESPONSE,
    });

    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.total).toBe(3);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.page).toBe(1);
  });

  it("should forward page and limit query params to api-gateway", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never);
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: true,
      status: 200,
      data: MOCK_HISTORY_RESPONSE,
    });

    const req = new Request("http://localhost/api/history?page=2&limit=10");
    await GET(req);

    const calledUrl = vi.mocked(fetchWithAuthJson).mock.calls[0][0] as string;
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("limit=10");
  });

  it("should propagate non-200 status from api-gateway", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies("tok") as never);
    vi.mocked(fetchWithAuthJson).mockResolvedValue({
      ok: false,
      status: 503,
      data: { error: "Service unavailable" },
    });

    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(503);
  });
});
