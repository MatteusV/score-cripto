-- CreateIndex
CREATE INDEX "analysis_requests_user_id_requested_at_idx" ON "analysis_requests"("user_id", "requested_at");

-- CreateIndex
CREATE INDEX "analysis_requests_status_idx" ON "analysis_requests"("status");
