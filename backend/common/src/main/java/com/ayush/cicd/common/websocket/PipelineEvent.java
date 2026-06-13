package com.ayush.cicd.common.websocket;

import com.ayush.cicd.common.enums.BuildStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Payload pushed to /topic/repository/{repoId} for every pipeline lifecycle
 * event.
 *
 * eventType values:
 * PIPELINE_QUEUED — workflow run created / queued
 * PIPELINE_STARTED — run moved to in_progress
 * PIPELINE_COMPLETED — run completed (check status field)
 * PIPELINE_FAILED — convenience alias when status == FAILURE
 * STAGE_STARTED — individual job/step started
 * STAGE_COMPLETED — individual job/step done
 * ANALYSIS_READY — AI root-cause analysis finished
 */
@Data
@Builder(toBuilder = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PipelineEvent {

    /** One of the values documented above */
    private String eventType;

    /** The MonitoredRepository ID this event belongs to */
    private Long repositoryId;

    /** Full owner/repo slug e.g. "ayushjindal026/cicd-analyzer" */
    private String repoFullName;

    /** PipelineRun database ID */
    private Long runId;

    /** GitHub Actions run ID (external) */
    private Long githubRunId;

    /** Current status of the run */
    private BuildStatus status;

    /** Stage/job name when eventType is STAGE_* */
    private String stageName;

    /** Human-readable summary — populated for ANALYSIS_READY */
    private String aiSummary;

    /** Failure category — populated for PIPELINE_FAILED / ANALYSIS_READY */
    private String failureCategory;

    /** Severity label: LOW / MEDIUM / HIGH / CRITICAL */
    private String severity;

    private String classificationSource;

    private Double confidenceScore;

    private String affectedComponent;

    private String branch;

    private String commitSha;

    private String commitMessage;

    /** ISO-8601 timestamp of the event */
    @Builder.Default
    private Instant timestamp = Instant.now();
}