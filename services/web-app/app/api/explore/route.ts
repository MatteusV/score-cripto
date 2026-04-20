import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchWithAuthJson } from "@/lib/fetch-with-auth";
import { createLogger } from "@/lib/logger";

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001";
const logger = createLogger("api/explore");

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access-token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, status, ok } = await fetchWithAuthJson(
      `${API_GATEWAY_URL}/explore`,
      {}
    );

    if (!ok) {
      logger.warn("upstream returned non-2xx", { status });
    }

    return NextResponse.json(data, { status: ok ? 200 : status });
  } catch (err) {
    logger.error(
      "failed to fetch explore data",
      {},
      err instanceof Error ? err : undefined
    );
    return NextResponse.json(
      { error: "Failed to fetch explore data" },
      { status: 503 }
    );
  }
}
