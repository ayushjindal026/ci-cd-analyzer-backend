package com.ayush.cicd.ingestion.mapper;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Maps GitHub API DTOs to PipelineRun entities.
 *
 * WHY a dedicated mapper class and not MapStruct here?
 * The status+conclusion → BuildStatus mapping is conditional logic,
 * not a simple field-to-field mapping. MapStruct handles simple
 * transformations elegantly but conditional logic requires
 * @Mapping with expression= or a custom method — at that point
 * a plain Java class is more readable and easier to unit test.
 *
 * This class has zero Spring dependencies — it's pure Java logic.
 * That makes it trivially unit testable without any Spring context.
 */
@Component
@Slf4j
public class GitHubRunMapper {

    /**
     * Converts a GitHub workflow run DTO into a PipelineRun entity.
     *
     * WHY pass MonitoredRepository as a parameter?
     * The entity needs the repository reference for the FK.
     * The mapper shouldn't do DB lookups — that's the service's job.
     * The service fetches the repo, then passes it here.
     * Mappers map. Services orchestrate. Single responsibility.
     *
     * @param dto        raw data from GitHub API
     * @param repository the already-loaded MonitoredRepository entity
     * @return a new PipelineRun ready to be saved (no id yet)
     */
    public PipelineRun toPipelineRun(
            GitHubWorkflowRunDto dto, MonitoredRepository repository) {

        BuildStatus status = mapStatus(dto.getStatus(), dto.getConclusion());

        Long durationMs = calculateDurationMs(dto);

        return PipelineRun.builder()
                .repository(repository)
                .externalRunId(String.valueOf(dto.getId()))
                .workflowName(dto.getName())
                .branch(dto.getHeadBranch())
                .headSha(dto.getHeadSha())
                .status(status)
                .startedAt(dto.getRunStartedAt())
                .completedAt("completed".equals(dto.getStatus()) ? dto.getUpdatedAt() : null)
                .durationMs(durationMs)
                .runUrl(dto.getHtmlUrl())
                .pullRequest("pull_request".equals(dto.getEvent()))
                .build();
    }

    /**
     * Maps GitHub's two-field status model to our single BuildStatus enum.
     *
     * GitHub status field:     "queued" | "in_progress" | "completed"
     * GitHub conclusion field: "success" | "failure" | "cancelled" |
     *                          "skipped" | "timed_out" | null
     *
     * The conclusion is only meaningful when status = "completed".
     * When status = "in_progress", conclusion is always null.
     */
    private BuildStatus mapStatus(String status, String conclusion) {
        if (status == null) {
            return BuildStatus.UNKNOWN;
        }

        return switch (status) {
            case "in_progress", "queued", "waiting" -> BuildStatus.IN_PROGRESS;
            case "completed" -> mapConclusion(conclusion);
            default -> {
                log.warn("Unknown GitHub run status: '{}'", status);
                yield BuildStatus.UNKNOWN;
            }
        };
    }

    private BuildStatus mapConclusion(String conclusion) {
        if (conclusion == null) {
            return BuildStatus.UNKNOWN;
        }

        return switch (conclusion) {
            case "success"   -> BuildStatus.SUCCESS;
            case "failure"   -> BuildStatus.FAILURE;
            case "cancelled" -> BuildStatus.CANCELLED;
            // timed_out and action_required are types of failures
            case "timed_out", "action_required" -> BuildStatus.FAILURE;
            // skipped runs — treat as unknown, not a real failure
            case "skipped"   -> BuildStatus.UNKNOWN;
            default -> {
                log.warn("Unknown GitHub run conclusion: '{}'", conclusion);
                yield BuildStatus.UNKNOWN;
            }
        };
    }

    /**
     * WHY calculate duration here and not store start/end and compute on query?
     * Storing pre-computed durationMs means analytics queries are simple:
     * SELECT AVG(duration_ms) — no date arithmetic in every query.
     * We still store startedAt and completedAt for time-range filtering.
     */
    private Long calculateDurationMs(GitHubWorkflowRunDto dto) {
        if (dto.getRunStartedAt() == null || dto.getUpdatedAt() == null) {
            return null;
        }
        if (!"completed".equals(dto.getStatus())) {
            return null; // run still in progress — no duration yet
        }
        long duration = dto.getUpdatedAt().toEpochMilli()
                - dto.getRunStartedAt().toEpochMilli();
        return duration > 0 ? duration : null;
    }
}