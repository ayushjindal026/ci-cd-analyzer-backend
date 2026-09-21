
// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/enums/AnalysisStatus.java
package com.ayush.cicd.common.enums;

/**
 * Tracks where a PipelineRun is in the AI analysis pipeline.
 */
public enum AnalysisStatus {

    PENDING,          // run completed — analysis has not started

    IN_PROGRESS,      // logs are being fetched / AI call is in flight

    DONE,             // RunAnalysis persisted successfully

    FAILED,           // analysis failed unexpectedly

    SKIPPED,          // run does not require analysis

    LOGS_UNAVAILABLE  // GitHub logs cannot be retrieved (expired/deleted/inaccessible)
}