import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forwardToUsers, UsersForwardError } from "./users-forward.js";

vi.mock("../config.js", () => ({
  config: {
    usersServiceUrl: "http://users-mock:3003",
    usersServiceTimeoutMs: 100,
  },
}));

vi.mock("@score-cripto/observability-node", () => ({
  getCorrelationId: () => "test-correlation-id",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(
  status: number,
  body: object | string | null = null
): Response {
  const text = body === null ? "" : typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("forwardToUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards GET with Authorization header and parses JSON response", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { plan: "PRO" }));

    const result = await forwardToUsers({
      method: "GET",
      path: "/billing/subscription",
      authHeader: "Bearer abc",
    });

    expect(result).toEqual({ status: 200, data: { plan: "PRO" } });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [
      string,
      { headers: Record<string, string>; method: string },
    ];
    expect(url).toBe("http://users-mock:3003/billing/subscription");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer abc");
    expect(init.headers["x-request-id"]).toBe("test-correlation-id");
  });

  it("forwards POST with JSON body and sets Content-Type", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { accessToken: "jwt" })
    );

    const result = await forwardToUsers({
      method: "POST",
      path: "/auth/login",
      body: { email: "a@b.com", password: "x" },
    });

    expect(result.status).toBe(200);
    const [, init] = mockFetch.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"email":"a@b.com","password":"x"}');
  });

  it("forwards raw body without re-serializing (for Stripe webhook)", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { received: true }));
    const raw = Buffer.from('{"type":"checkout.session.completed"}', "utf-8");

    await forwardToUsers({
      method: "POST",
      path: "/billing/webhook",
      rawBody: raw,
      extraHeaders: {
        "Content-Type": "application/json",
        "stripe-signature": "t=123,v1=abc",
      },
    });

    const [, init] = mockFetch.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: Buffer },
    ];
    expect(init.body).toBe(raw);
    expect(init.headers["stripe-signature"]).toBe("t=123,v1=abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("passes through non-2xx status without throwing", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: "bad creds" }));

    const result = await forwardToUsers({
      method: "POST",
      path: "/auth/login",
      body: { email: "a@b.com", password: "wrong" },
    });

    expect(result).toEqual({ status: 401, data: { error: "bad creds" } });
  });

  it("appends queryString to the URL", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { checkoutUrl: "u" }));

    await forwardToUsers({
      method: "GET",
      path: "/billing/checkout",
      queryString: "?priceId=price_123",
      authHeader: "Bearer abc",
    });

    const [url] = mockFetch.mock.calls[0] as [string, unknown];
    expect(url).toBe("http://users-mock:3003/billing/checkout?priceId=price_123");
  });

  it("throws UsersForwardError 504 on AbortError", async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    await expect(
      forwardToUsers({ method: "GET", path: "/profile", authHeader: "Bearer x" })
    ).rejects.toMatchObject({
      name: "UsersForwardError",
      statusCode: 504,
    });
  });

  it("throws UsersForwardError 503 on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      forwardToUsers({ method: "GET", path: "/profile", authHeader: "Bearer x" })
    ).rejects.toMatchObject({
      name: "UsersForwardError",
      statusCode: 503,
    });
  });

  it("returns data=null when upstream body is empty", async () => {
    // 204 não pode ter body via `new Response`; usamos 200 com string vazia
    mockFetch.mockResolvedValueOnce(new Response("", { status: 200 }));

    const result = await forwardToUsers({
      method: "POST",
      path: "/auth/refresh",
      body: { refreshToken: "r" },
    });

    expect(result).toEqual({ status: 200, data: null });
  });

  it("returns raw text as data when upstream body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("plain-text-error", { status: 502 })
    );

    const result = await forwardToUsers({
      method: "GET",
      path: "/profile",
      authHeader: "Bearer x",
    });

    expect(result).toEqual({ status: 502, data: "plain-text-error" });
  });
});

// Smoke: garantir que UsersForwardError carrega statusCode corretamente
describe("UsersForwardError", () => {
  it("sets name and statusCode", () => {
    const err = new UsersForwardError("boom", 503);
    expect(err.name).toBe("UsersForwardError");
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe("boom");
  });
});
