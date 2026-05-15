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

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PipelineRunService {

        private final PipelineRunRepository runRepository;

        private final MonitoredRepositoryRepository repositoryRepository;

        // =====================================================
        // Get Runs For Repository
        // =====================================================

        public PagedResponse<PipelineRunResponse> getRunsForRepository(
                        Long repositoryId,
                        int page,
                        int size) {

                // Validate repository exists
                if (!repositoryRepository.existsById(repositoryId)) {

                        throw new ResourceNotFoundException(
                                        "MonitoredRepository",
                                        repositoryId);
                }

                // Prevent huge page sizes
                int cappedSize = Math.min(size, 100);

                Pageable pageable = PageRequest.of(page, cappedSize);

                Page<PipelineRun> runsPage = runRepository
                                .findByRepository_IdOrderByStartedAtDesc(
                                                repositoryId,
                                                pageable);

                return PagedResponse
                                .<PipelineRunResponse>builder()

                                .content(
                                                runsPage.getContent()
                                                                .stream()
                                                                .map(this::toResponse)
                                                                .toList())

                                .page(runsPage.getNumber())

                                .size(runsPage.getSize())

                                .totalElements(
                                                runsPage.getTotalElements())

                                .totalPages(
                                                runsPage.getTotalPages())

                                .last(runsPage.isLast())

                                .build();
        }

        // =====================================================
        // Get Single Run
        // =====================================================

        public PipelineRunResponse getRunById(
                        Long runId) {

                PipelineRun run = runRepository.findById(runId)

                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "PipelineRun",
                                                runId));

                return toResponse(run);
        }

        // =====================================================
        // Convert Entity -> DTO
        // =====================================================

        private PipelineRunResponse toResponse(
                        PipelineRun run) {

                return PipelineRunResponse.builder()

                                .id(run.getId())

                                .externalRunId(
                                                run.getExternalRunId())

                                .workflowName(
                                                run.getWorkflowName())

                                .branch(
                                                run.getBranch())

                                .headSha(
                                                run.getHeadSha())

                                .status(
                                                run.getStatus())

                                .startedAt(
                                                run.getStartedAt())

                                .completedAt(
                                                run.getCompletedAt())

                                .durationMs(
                                                run.getDurationMs())

                                .durationFormatted(
                                                formatDuration(
                                                                run.getDurationMs()))

                                // REMOVED:
                                // .runUrl()
                                // .pullRequest()
                                // .createdAt()
                                // because entity does not contain them

                                .build();
        }

        // =====================================================
        // Duration Formatter
        // =====================================================

        private String formatDuration(
                        Long durationMs) {

                if (durationMs == null
                                || durationMs <= 0) {

                        return "N/A";
                }

                long totalSeconds = durationMs / 1000;

                long minutes = totalSeconds / 60;

                long seconds = totalSeconds % 60;

                if (minutes == 0) {
                        return seconds + "s";
                }

                return minutes
                                + "m "
                                + seconds
                                + "s";
        }
}