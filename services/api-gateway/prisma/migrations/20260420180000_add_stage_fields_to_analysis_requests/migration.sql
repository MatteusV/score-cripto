-- AlterTable
ALTER TABLE "analysis_requests" ADD COLUMN "current_stage" TEXT;
ALTER TABLE "analysis_requests" ADD COLUMN "stage_state" TEXT;
ALTER TABLE "analysis_requests" ADD COLUMN "stage_updated_at" TIMESTAMP(3);
