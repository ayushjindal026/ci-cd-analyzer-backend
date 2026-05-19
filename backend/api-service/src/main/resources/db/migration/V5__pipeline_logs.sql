CREATE TABLE IF NOT EXISTS pipeline_logs (
    id                      BIGSERIAL   PRIMARY KEY,
    run_id                  BIGINT      NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    repository_id           BIGINT      NOT NULL,
    stage                   VARCHAR(100) NOT NULL,
    compressed_log          BYTEA       NOT NULL,
    raw_size_bytes          INT,
    compressed_size_bytes   INT,
    stored_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_preview           VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_pl_run_id
    ON pipeline_logs (run_id);

CREATE INDEX IF NOT EXISTS idx_pl_repo_stage
    ON pipeline_logs (repository_id, stage);

COMMENT ON TABLE pipeline_logs IS
    'GZIP-compressed CI/CD stage logs. Stored after fetch from GitHub. '
    'Enables re-analysis without re-fetching, and survives GitHub log expiry (90 days).';

COMMENT ON COLUMN pipeline_logs.compressed_log IS
    'Raw log text compressed with GZIP. Use LogStorageService to decompress.';