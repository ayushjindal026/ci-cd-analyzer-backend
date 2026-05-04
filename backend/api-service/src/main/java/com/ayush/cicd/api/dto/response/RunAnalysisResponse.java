package com.ayush.cicd.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * WHY a DTO instead of returning RunAnalysis entity directly?
 * The entity has a @OneToOne to PipelineRun — Jackson will try to
 * serialize that, triggering lazy load outside transaction = error.
 * A DTO contains only the fields the client needs, nothing more.
 */
@Data
@Builder
public class RunAnalysisResponse {
    private Long id;
    private Long pipelineRunId;
    private String category;
    private String rootCauseSummary;
    private String suggestedFix;
    private Double confidenceScore;
    private String analysedByModel;
    private String logSnippet;
    private Instant createdAt;
}