-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "analysis_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "wallet_context_hash" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_data" (
    "id" TEXT NOT NULL,
    "analysis_request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "positive_factors" JSONB NOT NULL,
    "risk_factors" JSONB NOT NULL,
    "model_version" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "inference_duration_ms" INTEGER NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_requests_user_id_idx" ON "analysis_requests"("user_id");

-- CreateIndex
CREATE INDEX "analysis_requests_chain_address_idx" ON "analysis_requests"("chain", "address");

-- CreateIndex
CREATE INDEX "analysis_requests_wallet_context_hash_idx" ON "analysis_requests"("wallet_context_hash");

-- CreateIndex
CREATE UNIQUE INDEX "processed_data_analysis_request_id_key" ON "processed_data"("analysis_request_id");

-- CreateIndex
CREATE INDEX "processed_data_user_id_idx" ON "processed_data"("user_id");

-- CreateIndex
CREATE INDEX "processed_data_chain_address_idx" ON "processed_data"("chain", "address");

-- CreateIndex
CREATE INDEX "processed_data_valid_until_idx" ON "processed_data"("valid_until");

-- AddForeignKey
ALTER TABLE "processed_data" ADD CONSTRAINT "processed_data_analysis_request_id_fkey" FOREIGN KEY ("analysis_request_id") REFERENCES "analysis_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
