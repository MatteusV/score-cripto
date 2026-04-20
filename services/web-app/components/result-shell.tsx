"use client";

import { AlertCircleIcon, ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PipelinePanel } from "@/components/analyze/pipeline-panel";
import { ResultPanel } from "@/components/analyze/result-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWalletScore } from "@/hooks/use-wallet-score";

interface ResultShellProps {
  address: string;
  chain: string;
}

export function ResultShell({ chain, address }: ResultShellProps) {
  const {
    phase,
    result,
    error,
    errorCode,
    backendStatus,
    fromCache,
    currentStage,
    stageState,
    submit,
    reset,
  } = useWalletScore(chain, address);
  const t = useTranslations("analyze");
  const router = useRouter();

  useEffect(() => {
    if (chain && address) {
      submit();
    }
  }, [chain, address, submit]);

  // ── Pipeline state ────────────────────────────────────────────────
  if (phase === "submitting" || phase === "polling") {
    return (
      <PipelinePanel
        address={address}
        backendStatus={backendStatus}
        chain={chain}
        currentStage={currentStage}
        onCancel={() => {
          reset();
          router.push("/analyze");
        }}
        stageState={stageState}
      />
    );
  }

  // ── Completed state ───────────────────────────────────────────────
  if (phase === "completed" && result) {
    return (
      <ResultPanel
        address={address}
        chain={chain}
        fromCache={fromCache}
        onRecalculate={() => {
          reset();
          submit({ force: true });
        }}
        result={result}
      />
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="p-6">
        <Card className="animate-fade-up border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-5 py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircleIcon className="size-7 text-destructive" />
            </div>
            <div className="max-w-sm space-y-2 text-center">
              <p className="font-heading font-medium text-sm">
                {t("error.title")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t(`error.reasons.${errorCode ?? "internal_error"}`)}
              </p>
              {error ? (
                <details className="mt-2 text-left text-muted-foreground/70 text-xs">
                  <summary className="cursor-pointer select-none">
                    {t("error.technicalDetails")}
                  </summary>
                  <p className="mt-1 break-words font-mono">{error}</p>
                </details>
              ) : null}
            </div>
            <div className="flex gap-3">
              <Button
                className="cursor-pointer"
                onClick={() => void submit()}
                variant="outline"
              >
                <RefreshCwIcon data-icon="inline-start" />
                {t("retry")}
              </Button>
              <Button asChild className="cursor-pointer" variant="ghost">
                <Link href="/analyze">
                  <ArrowLeftIcon data-icon="inline-start" />
                  {t("result.back")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Idle state ────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <Card className="glass-panel animate-fade-up">
        <CardContent className="flex flex-col items-center gap-5 py-12">
          <p className="text-muted-foreground text-sm">{t("readyToStart")}</p>
          <Button className="cursor-pointer" onClick={() => void submit()}>
            {t("startAnalysis")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
