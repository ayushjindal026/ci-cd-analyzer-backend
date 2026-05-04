-- ================================================================
-- V1 — Initial schema
-- WHY Flyway instead of ddl-auto=create-drop?
-- create-drop destroys all data on every restart.
-- Flyway runs migrations exactly once, tracks them in a
-- flyway_schema_history table, and never re-runs them.
-- This is how every production DB schema is managed.
-- ================================================================

CREATE TABLE IF NOT EXISTS monitored_repositories (
    id               BIGSERIAL PRIMARY KEY,
    owner            VARCHAR(100) NOT NULL,
    repo_name        VARCHAR(100) NOT NULL,
    source           VARCHAR(30)  NOT NULL,
    default_branch   VARCHAR(100) DEFAULT 'main',
    last_synced_at   TIMESTAMPTZ,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_repo_owner_name_source UNIQUE (owner, repo_name, source)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id               BIGSERIAL PRIMARY KEY,
    repository_id    BIGINT       NOT NULL REFERENCES monitored_repositories(id),
    external_run_id  VARCHAR(100) NOT NULL,
    workflow_name    VARCHAR(255) NOT NULL,
    branch           VARCHAR(100),
    head_sha         VARCHAR(40),
    status           VARCHAR(20)  NOT NULL,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    duration_ms      BIGINT,
    run_url          VARCHAR(500),
    is_pull_request  BOOLEAN      DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_repo_status
    ON pipeline_runs(repository_id, status);

CREATE INDEX IF NOT EXISTS idx_runs_repo_started
    ON pipeline_runs(repository_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_runs_head_sha
    ON pipeline_runs(head_sha);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id               BIGSERIAL PRIMARY KEY,
    pipeline_run_id  BIGINT       NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    stage_name       VARCHAR(255) NOT NULL,
    status           VARCHAR(20)  NOT NULL,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    duration_ms      BIGINT,
    step_order       INTEGER,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stages_run_id
    ON pipeline_stages(pipeline_run_id);

CREATE TABLE IF NOT EXISTS run_analysis (
    id               BIGSERIAL PRIMARY KEY,
    pipeline_run_id  BIGINT       NOT NULL UNIQUE REFERENCES pipeline_runs(id),
    category         VARCHAR(50)  NOT NULL,
    root_cause_summary VARCHAR(1000) NOT NULL,
    suggested_fix    VARCHAR(1000) NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    analysed_by_model VARCHAR(100),
    log_snippet      TEXT,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL
);