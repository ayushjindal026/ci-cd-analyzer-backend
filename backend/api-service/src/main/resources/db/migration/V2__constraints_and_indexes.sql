-- ================================================================
-- V2 — Add missing constraints and indexes
-- WHY a separate migration and not editing V1?
-- Flyway checksums V1. Editing it causes a checksum mismatch
-- and Flyway refuses to start — it protects against silent
-- schema drift. New changes always go in new migration files.
-- ================================================================

-- Prevent duplicate runs from race conditions between scheduler
-- and manual sync. The Java-side check is not atomic — two threads
-- can both pass the existsByExternalRunId check before either inserts.
-- This constraint is the hard guarantee at the DB level.
ALTER TABLE pipeline_runs
    ADD CONSTRAINT uq_run_external_id
    UNIQUE (repository_id, external_run_id);

-- Prevent duplicate stage ingestion
ALTER TABLE pipeline_stages
    ADD CONSTRAINT uq_stage_run_order
    UNIQUE (pipeline_run_id, stage_name);

-- Partial index on active repos — scheduler calls findByActiveTrue()
-- every 10 minutes. Most repos will be active so a full index would
-- work, but a partial index is smaller and faster for this query.
CREATE INDEX idx_repos_is_active
    ON monitored_repositories(is_active)
    WHERE is_active = TRUE;

-- Index for filtering runs by branch — used in future analytics
-- "show me failure rate on main vs feature branches"
CREATE INDEX idx_runs_branch
    ON pipeline_runs(repository_id, branch);

-- Index for pull request filtering
CREATE INDEX idx_runs_is_pr
    ON pipeline_runs(repository_id, is_pull_request)
    WHERE is_pull_request = TRUE;

-- Widen LLM text columns — VARCHAR(1000) can be exceeded by
-- detailed failure analysis on complex build logs
ALTER TABLE run_analysis
    ALTER COLUMN root_cause_summary TYPE TEXT,
    ALTER COLUMN suggested_fix TYPE TEXT;