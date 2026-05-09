package com.ayush.cicd.analytics.dto;
import java.io.Serializable;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Aggregated metrics for one repository over a time window.
 * This is what gets returned to the frontend for the dashboard cards.
 */
@Data
@Builder
public class RepositoryMetricsDto implements Serializable {

    private Long repositoryId;
    private String window;
    private static final long serialVersionUID = 1L;
    // Overall numbers
    private long totalRuns;
    private long successfulRuns;
    private long failedRuns;
    private long cancelledRuns;

    /**
     * WHY Double and not int/long for rates?
     * Success rate is a percentage — 0.0 to 100.0.
     * Storing as Double allows "87.5%" not just "87%".
     * Round to 2 decimal places in the service before returning.
     */
    private double successRate;
    private double failureRate;

    // Duration stats across all completed runs
    private Long avgDurationMs;
    private String avgDurationFormatted;
    private Long maxDurationMs;
    private Long minDurationMs;

    // Per-workflow breakdown
    private List<WorkflowMetricsDto> workflowBreakdown;
}