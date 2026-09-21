-- ================================================================
-- V10 — Add LOGS_UNAVAILABLE analysis status
-- ================================================================
--
-- The application supports LOGS_UNAVAILABLE when GitHub no longer
-- provides workflow logs (for example, after log retention expires).
--
-- The existing database CHECK constraint predates this enum value
-- and therefore rejects it.
-- ================================================================

ALTER TABLE pipeline_runs
    DROP CONSTRAINT pipeline_runs_analysis_status_check;

ALTER TABLE pipeline_runs
    ADD CONSTRAINT pipeline_runs_analysis_status_check
    CHECK (
        analysis_status IN (
            'PENDING',
            'IN_PROGRESS',
            'DONE',
            'FAILED',
            'SKIPPED',
            'LOGS_UNAVAILABLE'
        )
    );