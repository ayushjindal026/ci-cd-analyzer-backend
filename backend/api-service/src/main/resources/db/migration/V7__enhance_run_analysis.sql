-- ─────────────────────────────────────────────────────────────────────────────
-- PATH:
-- backend/api/src/main/resources/db/migration/V7__enhance_run_analysis.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- Enhance AI analysis metadata
-- ============================================================================

ALTER TABLE run_analysis

    ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),

    ADD COLUMN IF NOT EXISTS severity VARCHAR(20)
        DEFAULT 'LOW',

    ADD COLUMN IF NOT EXISTS affected_component VARCHAR(300),

    ADD COLUMN IF NOT EXISTS remediation_steps TEXT,

    ADD COLUMN IF NOT EXISTS similar_patterns TEXT,

    ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(4,3),

    ADD COLUMN IF NOT EXISTS classification_source VARCHAR(20)
        DEFAULT 'LOCAL',

    ADD COLUMN IF NOT EXISTS estimated_fix_time VARCHAR(100),

    ADD COLUMN IF NOT EXISTS priority VARCHAR(20),

    ADD COLUMN IF NOT EXISTS root_cause TEXT,

    ADD COLUMN IF NOT EXISTS diagnosis TEXT,

    ADD COLUMN IF NOT EXISTS recommendation TEXT,

    ADD COLUMN IF NOT EXISTS similar_failures_count INTEGER
        DEFAULT 0,

    ADD COLUMN IF NOT EXISTS flakiness_score DOUBLE PRECISION
        DEFAULT 0.0,

    ADD COLUMN IF NOT EXISTS is_flaky BOOLEAN
        DEFAULT FALSE,

    ADD COLUMN IF NOT EXISTS failing_tests TEXT,

    ADD COLUMN IF NOT EXISTS analysed_at TIMESTAMPTZ
        DEFAULT NOW(),

    ADD COLUMN IF NOT EXISTS model_used VARCHAR(100);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ra_failure_category
    ON run_analysis (failure_category);

CREATE INDEX IF NOT EXISTS idx_ra_severity
    ON run_analysis (severity);

CREATE INDEX IF NOT EXISTS idx_ra_confidence
    ON run_analysis (confidence_score);

CREATE INDEX IF NOT EXISTS idx_ra_is_flaky
    ON run_analysis (is_flaky);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN run_analysis.failure_category
    IS 'AI/local classifier failure taxonomy';

COMMENT ON COLUMN run_analysis.confidence_score
    IS 'Classifier confidence score from 0.0 to 1.0';

COMMENT ON COLUMN run_analysis.classification_source
    IS 'LOCAL | AI | HYBRID';