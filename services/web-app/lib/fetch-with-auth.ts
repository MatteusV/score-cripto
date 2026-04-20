import { cookies } from "next/headers";

export interface FetchWithAuthResult<T> {
  data: T;
  ok: boolean;
  status: number;
}

/**
 * Wrapper de fetch para uso em Server Components e Route Handlers (BFFs).
 * Lê o cookie `access-token` e injeta como `Authorization: Bearer <token>`.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access-token")?.value;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

/**
 * Variante que faz parse do JSON e retorna { data, status, ok }.
 */
export async function fetchWithAuthJson<T>(
  url: string,
  options: RequestInit
): Promise<FetchWithAuthResult<T>> {
  const res = await fetchWithAuth(url, options);
  const data = (await res.json()) as T;
  return { data, status: res.status, ok: res.ok };
}
