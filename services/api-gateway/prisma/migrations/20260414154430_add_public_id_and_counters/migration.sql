-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "analysis_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "public_id" INTEGER,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "score" INTEGER,
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT,
    "positive_factors" JSONB,
    "risk_factors" JSONB,
    "model_version" TEXT,
    "prompt_version" TEXT,

    CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analysis_counters" (
    "user_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_analysis_counters_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "analysis_requests_user_id_idx" ON "analysis_requests"("user_id");

-- CreateIndex
CREATE INDEX "analysis_requests_user_id_public_id_idx" ON "analysis_requests"("user_id", "public_id");

-- CreateIndex
CREATE INDEX "analysis_requests_status_idx" ON "analysis_requests"("status");

-- CreateIndex
CREATE INDEX "analysis_requests_chain_address_idx" ON "analysis_requests"("chain", "address");

-- CreateIndex
CREATE INDEX "analysis_requests_user_id_chain_address_idx" ON "analysis_requests"("user_id", "chain", "address");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_requests_user_id_public_id_key" ON "analysis_requests"("user_id", "public_id");
