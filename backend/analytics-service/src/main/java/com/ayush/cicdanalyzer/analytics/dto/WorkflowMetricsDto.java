package com.ayush.cicd.analytics.dto;
import java.io.Serializable;
import lombok.Builder;
import lombok.Data;

/**
 * Metrics for a single workflow (e.g. "CI" or "Deploy") within a repo.
 * Nested inside RepositoryMetricsDto.workflowBreakdown.
 */
@Data
@Builder
public class WorkflowMetricsDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private String workflowName;
    private long totalRuns;
    private long successfulRuns;
    private long failedRuns;
    private double successRate;
    private Long avgDurationMs;
    private String avgDurationFormatted;
}