package com.ayush.cicd.api.dto.response;

import com.ayush.cicd.common.enums.BuildStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Response DTO for a single pipeline run.
 *
 * WHY not expose durationMs directly?
 * We expose durationMs as a raw number AND compute a human-readable
 * durationFormatted string (e.g. "2m 34s") here in the DTO.
 * The frontend can use either — raw for charts, formatted for display.
 * This is a service layer responsibility: the frontend should not
 * contain time-formatting logic.
 */
@Data
@Builder
public class PipelineRunResponse {
    private Long id;
    private String externalRunId;
    private String workflowName;
    private String branch;
    private String headSha;
    private BuildStatus status;
    private Instant startedAt;
    private Instant completedAt;
    private Long durationMs;
    private String durationFormatted;
    private String runUrl;
    private boolean pullRequest;
    private Instant createdAt;
}