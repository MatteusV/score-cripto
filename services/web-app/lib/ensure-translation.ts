import { translateAnalysis } from "@/lib/deepl";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lib/ensure-translation");
const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

interface AnalysisFields {
  positiveFactors: string[];
  reasoning: string;
  riskFactors: string[];
}

/**
 * Ensures a translated version of the analysis fields exists for the given locale.
 * Returns null for English (source language) — no translation needed.
 * On cache hit → returns stored translation.
 * On cache miss → calls DeepL, persists to api-gateway, returns translated fields.
 */
export async function ensureTranslation(
  analysisId: string,
  locale: string,
  englishFields: AnalysisFields
): Promise<AnalysisFields | null> {
  if (locale === "en") {
    return null;
  }

  try {
    // 1. Check cache in api-gateway
    const cacheRes = await fetchWithAuth(
      `${API_GATEWAY_URL}/analysis/${analysisId}/translations/${locale}`,
      { cache: "no-store" }
    );

    if (cacheRes.ok) {
      const cached = (await cacheRes.json()) as {
        reasoning: string | null;
        positiveFactors: string[] | null;
        riskFactors: string[] | null;
      };
      logger.info("Translation cache hit", { analysisId, locale });
      return {
        reasoning: cached.reasoning ?? englishFields.reasoning,
        positiveFactors:
          cached.positiveFactors ?? englishFields.positiveFactors,
        riskFactors: cached.riskFactors ?? englishFields.riskFactors,
      };
    }

    // 2. Cache miss — translate via DeepL
    logger.info("Translation cache miss — calling DeepL", {
      analysisId,
      locale,
    });
    const translated = await translateAnalysis({
      reasoning: englishFields.reasoning,
      positiveFactors: englishFields.positiveFactors,
      riskFactors: englishFields.riskFactors,
      targetLocale: locale,
    });

    // 3. Persist to api-gateway (fire-and-forget errors — next request will find it cached)
    fetchWithAuth(
      `${API_GATEWAY_URL}/analysis/${analysisId}/translations/${locale}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translated),
        cache: "no-store",
      }
    ).catch((err: unknown) => {
      logger.warn("Failed to persist translation — will retry next request", {
        err,
        analysisId,
        locale,
      });
    });

    return translated;
  } catch (err) {
    logger.error("Translation failed — falling back to English", {
      err,
      analysisId,
      locale,
    });
    return null;
  }
}
