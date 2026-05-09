package com.ayush.cicd.analytics.dto;
import java.io.Serializable;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Represents a workflow identified as flaky.
 *
 * flakinessScore = flaky transitions / total runs in window * 100
 * A "flaky transition" = FAILURE followed by SUCCESS on the same headSha
 * and same workflowName without a code change.
 *
 * WHY include lastFlakyAt?
 * A workflow that was flaky 6 months ago but clean for the last month
 * is not actually a problem right now. lastFlakyAt lets the frontend
 * show "last seen X days ago" so engineers can prioritise.
 */
@Data
@Builder
public class FlakyWorkflowDto implements Serializable{
    private String workflowName;
    private long totalRuns;
    private long flakyTransitions;
    private double flakinessScore;
    private Instant lastFlakyAt;
    private static final long serialVersionUID = 1L;
}