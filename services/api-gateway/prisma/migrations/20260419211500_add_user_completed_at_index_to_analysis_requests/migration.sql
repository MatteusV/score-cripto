-- CreateIndex
CREATE INDEX "analysis_requests_user_id_completed_at_idx" ON "analysis_requests"("user_id", "completed_at");
