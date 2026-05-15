// PATH: backend/common/src/main/java/com/ayush/cicd/common/enums/BuildStatus.java
package com.ayush.cicd.common.enums;

/**
 * Canonical status values for a PipelineRun.
 * Maps from GitHub Actions conclusion/status strings.
 */
public enum BuildStatus {

    PENDING, // queued, waiting to start
    RUNNING, // in_progress
    SUCCESS, // conclusion = success
    FAILED, // conclusion = failure
    QUEUED,
    CANCELLED, // conclusion = cancelled
    SKIPPED, // conclusion = skipped
    UNKNOWN; // anything else

    /** Convert raw GitHub webhook string to BuildStatus safely. */
    public static BuildStatus from(String conclusion, String status) {
        if (conclusion != null) {
            return switch (conclusion.toLowerCase()) {
                case "success" -> SUCCESS;
                case "failure" -> FAILED;
                case "cancelled" -> CANCELLED;
                case "skipped" -> SKIPPED;
                default -> UNKNOWN;
            };
        }
        if (status != null) {
            return switch (status.toLowerCase()) {
                case "queued" -> QUEUED;
                case "in_progress" -> RUNNING;
                case "completed" -> UNKNOWN; // need conclusion to know final state
                default -> UNKNOWN;
            };
        }
        return UNKNOWN;
    }

    public boolean isTerminal() {
        return this == SUCCESS || this == FAILED || this == CANCELLED || this == SKIPPED;
    }

    public boolean isFailure() {
        return this == FAILED;
    }
}
