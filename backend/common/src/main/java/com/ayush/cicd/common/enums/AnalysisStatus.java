
// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/enums/AnalysisStatus.java
package com.ayush.cicd.common.enums;

/** Tracks where a PipelineRun is in the AI analysis pipeline. */
public enum AnalysisStatus {
    PENDING, // run just completed — not yet picked up
    IN_PROGRESS, // logs being fetched / AI call in flight
    DONE, // RunAnalysis persisted successfully
    FAILED, // analysis errored out (see logs)
    SKIPPED // run was not a failure — no analysis needed
}