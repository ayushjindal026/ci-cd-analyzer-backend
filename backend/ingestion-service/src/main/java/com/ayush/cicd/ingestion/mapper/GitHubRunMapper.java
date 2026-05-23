// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/ingestion-service/src/main/java/com/ayush/cicd/ingestion/mapper/GitHubRunMapper.java
// ─────────────────────────────────────────────────────────────────────────────
package com.ayush.cicd.ingestion.mapper;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.AnalysisStatus;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import org.springframework.stereotype.Component;

/**
 * Maps GitHubWorkflowRunDto → PipelineRun entity.
 * Centralised here so mapping logic isn't scattered across services.
 */
@Component
public class GitHubRunMapper {

    public PipelineRun toEntity(GitHubWorkflowRunDto dto, MonitoredRepository repo) {
        BuildStatus status = BuildStatus.from(dto.getConclusion(), dto.getStatus());

        return PipelineRun.builder()
                .externalRunId(dto.getExternalId())
                .repository(repo)
                .workflowName(dto.getWorkflowName())
                .branch(dto.getBranch())
                .headSha(dto.getHeadSha())
                .status(status)
                .triggeredBy(dto.getEvent())
                .startedAt(dto.getStartedAt())
                .completedAt(computedCompletedAt(dto))
                .durationMs(computeDurationMs(dto))
                .commitMessage(extractCommitMessage(dto))
                .logsFetched(false)
                .analysisStatus(AnalysisStatus.PENDING)
                .build();
    }

    public void updateFromDto(PipelineRun existing, GitHubWorkflowRunDto dto) {
        BuildStatus newStatus = BuildStatus.from(dto.getConclusion(), dto.getStatus());
        existing.setStatus(newStatus);
        existing.setBranch(dto.getBranch());
        existing.setHeadSha(dto.getHeadSha());

        if (dto.getStartedAt() != null && existing.getStartedAt() == null) {
            existing.setStartedAt(dto.getStartedAt());
        }

        java.time.Instant completed = computedCompletedAt(dto);
        if (completed != null) {
            existing.setCompletedAt(completed);
            if (existing.getStartedAt() != null) {
                existing.setDurationMs(
                    completed.toEpochMilli() - existing.getStartedAt().toEpochMilli()
                );
            }
        }

        if (existing.getCommitMessage() == null) {
            existing.setCommitMessage(extractCommitMessage(dto));
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private java.time.Instant computedCompletedAt(GitHubWorkflowRunDto dto) {
        // Only set completedAt when the run is actually done
        BuildStatus s = BuildStatus.from(dto.getConclusion(), dto.getStatus());
        return s.isTerminal() ? dto.getCompletedAt() : null;
    }

    private Long computeDurationMs(GitHubWorkflowRunDto dto) {
        if (dto.getStartedAt() == null || dto.getCompletedAt() == null) return null;
        BuildStatus s = BuildStatus.from(dto.getConclusion(), dto.getStatus());
        if (!s.isTerminal()) return null;
        return dto.getCompletedAt().toEpochMilli() - dto.getStartedAt().toEpochMilli();
    }

    private String extractCommitMessage(GitHubWorkflowRunDto dto) {
        if (dto.getHeadCommit() == null) return null;
        String msg = dto.getHeadCommit().getMessage();
        if (msg == null) return null;
        // Truncate to first line only
        int nl = msg.indexOf('\n');
        return nl > 0 ? msg.substring(0, nl) : msg;
    }
}