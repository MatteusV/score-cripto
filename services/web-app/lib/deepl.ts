const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

// Maps app locale to DeepL target_lang codes
const LOCALE_TO_DEEPL: Record<string, string> = {
  "pt-BR": "PT-BR",
  es: "ES",
};

interface DeepLTranslateInput {
  positiveFactors: string[];
  reasoning: string;
  riskFactors: string[];
  targetLocale: string;
}

interface DeepLTranslateResult {
  positiveFactors: string[];
  reasoning: string;
  riskFactors: string[];
}

export async function translateAnalysis(
  input: DeepLTranslateInput
): Promise<DeepLTranslateResult> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not configured");
  }

  const targetLang = LOCALE_TO_DEEPL[input.targetLocale];
  if (!targetLang) {
    throw new Error(
      `Unsupported locale for translation: ${input.targetLocale}`
    );
  }

  // Batch all texts in a single request to minimize API calls
  const texts = [
    input.reasoning,
    ...input.positiveFactors,
    ...input.riskFactors,
  ];

  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "EN",
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepL API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    translations: Array<{ text: string }>;
  };
  const translated = data.translations.map((t) => t.text);

  return {
    reasoning: translated[0],
    positiveFactors: translated.slice(1, 1 + input.positiveFactors.length),
    riskFactors: translated.slice(1 + input.positiveFactors.length),
  };
}
