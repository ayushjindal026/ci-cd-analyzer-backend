// PATH: backend/src/main/java/com/ayush/cicd/api/dto/response/RepoMetricsDto.java
package com.ayush.cicd.api.dto.response;

import lombok.*;
import java.util.List;

/**
 * Returned by GET /api/v1/repositories/{id}/metrics
 * Consumed directly by the React dashboard charts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepoMetricsDto {

    // ── Totals ──────────────────────────────────────────────────────────────
    private int totalRuns;
    private int successfulRuns;
    private int failedRuns;
    private int runningRuns;
    private int pendingRuns;

    // ── Rates ───────────────────────────────────────────────────────────────
    private int successRate; // 0-100
    private int failureRate; // 0-100
    private int avgDuration; // seconds

    // ── Chart data ──────────────────────────────────────────────────────────

    /** For FailureRateChart — [{date, failureRate, successRate}] */
    private List<TrendPoint> failureRateTrend;

    /** For StageDurationChart — [{stage, avgDuration, maxDuration}] */
    private List<StageDurationPoint> stageDurations;

    /** For SuccessRatioChart — [{name, value}] */
    private List<StatusCount> statusBreakdown;

    // ── AI enrichment ───────────────────────────────────────────────────────
    private int flakyTestCount;
    private int windowDays;
}