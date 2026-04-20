import type { PrismaClient } from "../../generated/prisma/client.js";

export interface ExploreWallet {
  address: string;
  chain: string;
  confidence: number | null;
  lastAnalyzedAt: string;
  lookups: number;
  reasoning: string | null;
  riskFactors: string[];
  score: number;
}

export interface ExploreRecent {
  address: string;
  chain: string;
  id: string;
  publicId: number | null;
  requestedAt: string;
  score: number | null;
}

export interface ExploreChainDistribution {
  chain: string;
  count: number;
  pct: number;
}

export interface ExploreStats {
  chains: number;
  risky: number;
  totalAnalyses: number;
  uniqueAddresses: number;
}

export interface ExploreCategory {
  count: number;
  id: string;
}

export interface ExploreData {
  categories: ExploreCategory[];
  chainDistribution: ExploreChainDistribution[];
  leaderboard: ExploreWallet[];
  recent: ExploreRecent[];
  risk: ExploreWallet[];
  stats: ExploreStats;
  trending: ExploreWallet[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  exchange: [
    "exchange",
    "cex",
    "binance",
    "coinbase",
    "kraken",
    "bitfinex",
    "okx",
  ],
  defi: [
    "defi",
    "uniswap",
    "aave",
    "compound",
    "curve",
    "lido",
    "protocol",
    "vault",
    "router",
  ],
  mixer: ["mixer", "tornado", "wasabi", "samourai", "privacy pool"],
  sanctions: ["sanction", "ofac", "sdn", "blacklist", "hmt"],
  bridge: ["bridge", "wormhole", "across", "stargate", "layerzero", "cctp"],
  nft: ["nft", "opensea", "blur", "royalty", "collection"],
  stablecoin: ["stablecoin", "usdc", "usdt", "dai", "pyusd", "issuer"],
  whale: ["whale", "large holder", "top holder"],
};

const TRENDING_WINDOW_DAYS = 7;
const LIMIT = 10;

export class GetExploreDataUseCase {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute(userId: string): Promise<ExploreData> {
    const since = new Date(
      Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const [
      trendingRaw,
      leaderboardRaw,
      riskRaw,
      recentRaw,
      chainCountsRaw,
      totalAnalyses,
      uniqueAddressesRaw,
      riskyCount,
    ] = await Promise.all([
      this.prisma.analysisRequest.groupBy({
        by: ["chain", "address"],
        where: { status: "COMPLETED", requestedAt: { gte: since } },
        _count: { _all: true },
        _avg: { score: true, confidence: true },
        _max: { completedAt: true },
        orderBy: { _count: { address: "desc" } },
        take: LIMIT,
      }),
      this.prisma.analysisRequest.findMany({
        where: { status: "COMPLETED", score: { gte: 80 } },
        orderBy: [{ score: "desc" }, { completedAt: "desc" }],
        distinct: ["chain", "address"],
        take: LIMIT,
        select: {
          chain: true,
          address: true,
          score: true,
          confidence: true,
          completedAt: true,
          reasoning: true,
          riskFactors: true,
        },
      }),
      this.prisma.analysisRequest.findMany({
        where: { status: "COMPLETED", score: { lt: 40 } },
        orderBy: [{ score: "asc" }, { completedAt: "desc" }],
        distinct: ["chain", "address"],
        take: LIMIT,
        select: {
          chain: true,
          address: true,
          score: true,
          confidence: true,
          completedAt: true,
          reasoning: true,
          riskFactors: true,
        },
      }),
      this.prisma.analysisRequest.findMany({
        where: { userId, status: "COMPLETED" },
        orderBy: { requestedAt: "desc" },
        take: 5,
        select: {
          id: true,
          publicId: true,
          chain: true,
          address: true,
          score: true,
          requestedAt: true,
        },
      }),
      this.prisma.analysisRequest.groupBy({
        by: ["chain"],
        where: { status: "COMPLETED" },
        _count: { _all: true },
        orderBy: { _count: { chain: "desc" } },
      }),
      this.prisma.analysisRequest.count({ where: { status: "COMPLETED" } }),
      this.prisma.analysisRequest.findMany({
        where: { status: "COMPLETED" },
        distinct: ["chain", "address"],
        select: { id: true },
      }),
      this.prisma.analysisRequest.count({
        where: { status: "COMPLETED", score: { lt: 40 } },
      }),
    ]);

    const categoryRows = await this.prisma.analysisRequest.findMany({
      where: { status: "COMPLETED" },
      select: { reasoning: true, riskFactors: true, positiveFactors: true },
    });

    const categories: ExploreCategory[] = Object.entries(CATEGORY_KEYWORDS).map(
      ([id, keywords]) => {
        const count = categoryRows.reduce((acc, row) => {
          const haystack = [
            row.reasoning ?? "",
            ...((row.riskFactors as string[] | null) ?? []),
            ...((row.positiveFactors as string[] | null) ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return keywords.some((k) => haystack.includes(k)) ? acc + 1 : acc;
        }, 0);
        return { id, count };
      }
    );

    const trendingAddresses = trendingRaw.map((row) => ({
      chain: row.chain,
      address: row.address,
    }));
    const trendingDetails =
      trendingAddresses.length > 0
        ? await this.prisma.analysisRequest.findMany({
            where: {
              status: "COMPLETED",
              OR: trendingAddresses,
            },
            orderBy: { completedAt: "desc" },
            distinct: ["chain", "address"],
            select: {
              chain: true,
              address: true,
              reasoning: true,
              riskFactors: true,
            },
          })
        : [];

    const detailsMap = new Map(
      trendingDetails.map((d) => [`${d.chain}:${d.address}`, d])
    );

    const trending: ExploreWallet[] = trendingRaw.map((row) => {
      const detail = detailsMap.get(`${row.chain}:${row.address}`);
      return {
        chain: row.chain,
        address: row.address,
        score: Math.round(row._avg.score ?? 0),
        confidence: row._avg.confidence,
        lookups: row._count._all,
        lastAnalyzedAt: (row._max.completedAt ?? new Date()).toISOString(),
        reasoning: detail?.reasoning ?? null,
        riskFactors: (detail?.riskFactors as string[] | undefined) ?? [],
      };
    });

    const mapDetailed = (
      r: (typeof leaderboardRaw)[number]
    ): ExploreWallet => ({
      chain: r.chain,
      address: r.address,
      score: r.score ?? 0,
      confidence: r.confidence,
      lookups: 1,
      lastAnalyzedAt: (r.completedAt ?? new Date()).toISOString(),
      reasoning: r.reasoning,
      riskFactors: (r.riskFactors as string[] | null) ?? [],
    });

    const totalCompleted = chainCountsRaw.reduce(
      (acc, row) => acc + row._count._all,
      0
    );
    const chainDistribution: ExploreChainDistribution[] = chainCountsRaw.map(
      (row) => ({
        chain: row.chain,
        count: row._count._all,
        pct:
          totalCompleted > 0
            ? Math.round((row._count._all / totalCompleted) * 100)
            : 0,
      })
    );

    return {
      trending,
      leaderboard: leaderboardRaw.map(mapDetailed),
      risk: riskRaw.map(mapDetailed),
      recent: recentRaw.map((r) => ({
        id: r.id,
        publicId: r.publicId,
        chain: r.chain,
        address: r.address,
        score: r.score,
        requestedAt: (r.requestedAt ?? new Date()).toISOString(),
      })),
      chainDistribution,
      categories,
      stats: {
        totalAnalyses,
        uniqueAddresses: uniqueAddressesRaw.length,
        chains: chainCountsRaw.length,
        risky: riskyCount,
      },
    };
  }
}
