-- CreateTable
CREATE TABLE "analysis_translations" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "reasoning" TEXT,
    "positive_factors" JSONB,
    "risk_factors" JSONB,
    "translated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_translations_analysis_id_idx" ON "analysis_translations"("analysis_id");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_translations_analysis_id_locale_key" ON "analysis_translations"("analysis_id", "locale");

-- AddForeignKey
ALTER TABLE "analysis_translations" ADD CONSTRAINT "analysis_translations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analysis_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
