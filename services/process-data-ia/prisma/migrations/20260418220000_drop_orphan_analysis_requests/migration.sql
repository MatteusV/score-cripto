-- Drop orphan AnalysisRequest scaffolding. The model lives exclusively in
-- the api-gateway DB now; process-data-ia keeps analysis_request_id only as
-- a logical cross-service pointer (no FK at the database level).
--
-- Order matters: FK depends on the unique index, and the orphan table is
-- the FK target — drop them in reverse-dependency order.

ALTER TABLE "processed_data" DROP CONSTRAINT IF EXISTS "processed_data_analysis_request_id_fkey";
DROP INDEX IF EXISTS "processed_data_analysis_request_id_key";
DROP TABLE IF EXISTS "analysis_requests";
