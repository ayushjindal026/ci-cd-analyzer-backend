package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.response.PagedResponse;
import com.ayush.cicd.api.dto.response.PipelineRunResponse;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for querying pipeline run data.
 * Kept separate from RepositoryService — single responsibility.
 * RepositoryService manages repo lifecycle (add, deactivate).
 * PipelineRunService handles run queries and analytics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PipelineRunService {

    private final PipelineRunRepository runRepository;
    private final MonitoredRepositoryRepository repositoryRepository;

    /**
     * Returns paginated pipeline runs for a repository, newest first.
     *
     * WHY validate repository existence before querying runs?
     * If the repoId doesn't exist, runRepository returns an empty page —
     * looks like "no runs" instead of "repo not found". These are
     * different situations and clients need to distinguish them.
     * 404 is more honest than an empty 200.
     *
     * @param repositoryId the repo to query
     * @param page         zero-based page number
     * @param size         results per page (capped at 100)
     */
    public PagedResponse<PipelineRunResponse> getRunsForRepository(
            Long repositoryId, int page, int size) {

        // Validate repo exists first
        if (!repositoryRepository.existsById(repositoryId)) {
            throw new ResourceNotFoundException("MonitoredRepository", repositoryId);
        }

        // Cap page size — prevent clients requesting 10000 rows
        int cappedSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, cappedSize);

        Page<PipelineRun> runsPage = runRepository
                .findByRepositoryIdOrderByStartedAtDesc(repositoryId, pageable);

        return PagedResponse.<PipelineRunResponse>builder()
                .content(runsPage.getContent().stream()
                        .map(this::toResponse)
                        .toList())
                .page(runsPage.getNumber())
                .size(runsPage.getSize())
                .totalElements(runsPage.getTotalElements())
                .totalPages(runsPage.getTotalPages())
                .last(runsPage.isLast())
                .build();
    }

    public PipelineRunResponse getRunById(Long runId) {
        PipelineRun run = runRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", runId));
        return toResponse(run);
    }

    private PipelineRunResponse toResponse(PipelineRun run) {
        return PipelineRunResponse.builder()
                .id(run.getId())
                .externalRunId(run.getExternalRunId())
                .workflowName(run.getWorkflowName())
                .branch(run.getBranch())
                .headSha(run.getHeadSha())
                .status(run.getStatus())
                .startedAt(run.getStartedAt())
                .completedAt(run.getCompletedAt())
                .durationMs(run.getDurationMs())
                .durationFormatted(formatDuration(run.getDurationMs()))
                .runUrl(run.getRunUrl())
                .pullRequest(run.isPullRequest())
                .createdAt(run.getCreatedAt())
                .build();
    }

    /**
     * Converts milliseconds to human-readable format.
     * Examples: 154000 → "2m 34s",  45000 → "45s",  null → "N/A"
     */
    private String formatDuration(Long durationMs) {
        if (durationMs == null || durationMs <= 0) {
            return "N/A";
        }
        long totalSeconds = durationMs / 1000;
        long minutes = totalSeconds / 60;
        long seconds = totalSeconds % 60;

        if (minutes == 0) {
            return seconds + "s";
        }
        return minutes + "m " + seconds + "s";
    }
}