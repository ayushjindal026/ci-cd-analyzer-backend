package com.ayush.cicd.common.enums;

/**
 * Normalized build status across all CI systems.
 *
 * GitHub Actions raw values: "completed/success", "completed/failure", "in_progress", "cancelled"
 * Jenkins raw values:        SUCCESS, FAILURE, UNSTABLE, ABORTED
 *
 * Both map to these 5 values at ingestion time in the mapper layer.
 * Analytics queries only ever deal with these — no source-specific strings in the DB.
 */
public enum BuildStatus {
    SUCCESS,
    FAILURE,
    IN_PROGRESS,
    CANCELLED,
    UNKNOWN
}