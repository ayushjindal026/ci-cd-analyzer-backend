-- ============================================================================
-- V11 — Align run_analysis schema with the enhanced RunAnalysis entity
-- ============================================================================

-- The enhanced entity uses pipeline_run_id as the canonical PipelineRun
-- reference. Remove the obsolete duplicate run_id column and its indexes/
-- constraints.

DROP INDEX IF EXISTS idx_ra_run;

ALTER TABLE run_analysis
    DROP CONSTRAINT IF EXISTS ukram0ouevdbi4pey7rswcl8jvj;

ALTER TABLE run_analysis
    DROP COLUMN IF EXISTS run_id;


-- The V1 schema used these legacy analysis columns.
-- V7 introduced their enhanced replacements, which are now used by the
-- RunAnalysis entity.

ALTER TABLE run_analysis
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS root_cause_summary,
    DROP COLUMN IF EXISTS suggested_fix,
    DROP COLUMN IF EXISTS analysed_by_model,
    DROP COLUMN IF EXISTS log_snippet,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at;