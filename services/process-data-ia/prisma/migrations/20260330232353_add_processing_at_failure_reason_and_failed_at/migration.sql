-- AlterTable
ALTER TABLE "analysis_requests" ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "processing_at" TIMESTAMP(3);
