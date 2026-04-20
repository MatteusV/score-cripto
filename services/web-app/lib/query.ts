export const SUPPORTED_CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "base", label: "Base" },
  { value: "optimism", label: "Optimism" },
  { value: "avalanche", label: "Avalanche" },
  { value: "bsc", label: "BNB Smart Chain" },
] as const;

export function normalizeChainInput(input: string) {
  const normalized = input.trim().toLowerCase();
  return (
    SUPPORTED_CHAINS.find((option) => option.value === normalized)?.value ??
    "ethereum"
  );
}

export type AnalyzeParams =
  | { mode: "history"; publicId: number }
  | { mode: "new"; chain: string; address: string };

export function parseAnalyzeSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): AnalyzeParams {
  const rawId = Array.isArray(searchParams.id)
    ? searchParams.id[0]
    : searchParams.id;

  if (rawId !== undefined) {
    const publicId = Number(rawId);
    if (Number.isInteger(publicId) && publicId > 0) {
      return { mode: "history", publicId };
    }
  }

  const rawChain = Array.isArray(searchParams.chain)
    ? searchParams.chain[0]
    : searchParams.chain;
  const rawAddress = Array.isArray(searchParams.address)
    ? searchParams.address[0]
    : searchParams.address;

  return {
    mode: "new",
    chain: normalizeChainInput(rawChain ?? "ethereum"),
    address: (rawAddress ?? "").trim(),
  };
}
