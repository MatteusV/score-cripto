import { getTranslations } from "next-intl/server";
import { AnalyzeInputShell } from "@/components/analyze/input-shell";
import { HistoricalResultShell } from "@/components/historical-result-shell";
import { ResultShell } from "@/components/result-shell";
import { Topbar } from "@/components/topbar";
import { parseAnalyzeSearchParams } from "@/lib/query";

interface AnalyzePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const params = parseAnalyzeSearchParams(await searchParams);
  const t = await getTranslations("analyze");

  // History mode
  if (params.mode === "history") {
    return (
      <div className="flex flex-col">
        <Topbar subtitle={t("pageSubtitle")} title={t("pageTitle")} />
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
          <HistoricalResultShell publicId={params.publicId} />
        </div>
      </div>
    );
  }

  // Input mode — no address provided
  if (!params.address) {
    const ti = await getTranslations("analyze.input");
    return (
      <div className="flex flex-col">
        <Topbar subtitle={ti("subtitle")} title={ti("title")} />
        <AnalyzeInputShell />
      </div>
    );
  }

  // Analysis mode — chain + address provided
  return (
    <div className="flex flex-col">
      <Topbar subtitle={t("pageSubtitle")} title={t("pageTitle")} />
      <ResultShell address={params.address} chain={params.chain} />
    </div>
  );
}
