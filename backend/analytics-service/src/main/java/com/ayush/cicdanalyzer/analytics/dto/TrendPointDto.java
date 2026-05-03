package com.ayush.cicd.analytics.dto;
import java.io.Serializable;
import lombok.Builder;
import lombok.Data;

/**
 * One data point in a time-series chart.
 * Represents a single day's worth of pipeline run data.
 *
 * Used for the build volume trend chart on the dashboard:
 * X axis = date, Y axis = run counts by status.
 */
@Data
@Builder
public class TrendPointDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private String date;          // "2026-05-01" — ISO date string for chart labels
    private long totalRuns;
    private long successfulRuns;
    private long failedRuns;
}