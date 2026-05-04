package com.ayush.cicd.api.controller;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.client.AiAnalysisClient;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.api.dto.response.PagedResponse;
import com.ayush.cicd.api.dto.response.PipelineRunResponse;

import com.ayush.cicd.api.service.RepositoryService;
import com.ayush.cicd.api.service.PipelineRunService;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;

import com.ayush.cicd.analytics.service.AnalyticsService;
import com.ayush.cicd.analytics.dto.RepositoryMetricsDto;
import com.ayush.cicd.analytics.dto.FlakyWorkflowDto;
import com.ayush.cicd.analytics.dto.TrendPointDto;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Slf4j
public class RepositoryController {

    private final RepositoryService repositoryService;
    private final GitHubIngestionService gitHubIngestionService;
    private final PipelineRunService pipelineRunService;
    private final AnalyticsService analyticsService;

    private final RunAnalysisRepository runAnalysisRepository;
    private final PipelineRunRepository pipelineRunRepository;
    private final AiAnalysisClient aiAnalysisClient;

    // ===================== REPOSITORY =====================

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepositoryResponse>>> getAllRepositories() {
        return ResponseEntity.ok(ApiResponse.success(repositoryService.findAllActive()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepositoryResponse>> getRepository(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(repositoryService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RepositoryResponse>> addRepository(
            @Valid @RequestBody AddRepositoryRequest request) {

        RepositoryResponse response = repositoryService.addRepository(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Repository added successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateRepository(@PathVariable Long id) {
        repositoryService.deactivateRepository(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Repository deactivated"));
    }

    // ===================== SYNC =====================

    @PostMapping("/{id}/sync")
    public ResponseEntity<ApiResponse<String>> syncRepository(@PathVariable Long id) {

        log.info("Manual sync triggered for repository id={}", id);

        int newRuns = gitHubIngestionService.syncRepository(id);

        return ResponseEntity.ok(
                ApiResponse.success(newRuns + " new runs ingested", "Sync completed")
        );
    }

    // ===================== RUNS =====================

    @GetMapping("/{id}/runs")
    public ResponseEntity<ApiResponse<PagedResponse<PipelineRunResponse>>> getRunsForRepository(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(ApiResponse.success(
                pipelineRunService.getRunsForRepository(id, page, size)
        ));
    }

    @GetMapping("/{repoId}/runs/{runId}")
    public ResponseEntity<ApiResponse<PipelineRunResponse>> getRun(
            @PathVariable Long repoId,
            @PathVariable Long runId) {

        PipelineRun run = pipelineRunRepository.findByIdWithRepository(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", runId));

        if (!run.getRepository().getId().equals(repoId)) {
            throw new ResourceNotFoundException("PipelineRun not in this repository", runId);
        }

        PipelineRunResponse response = pipelineRunService.getRunById(runId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ===================== ANALYSIS =====================

    @GetMapping("/{repoId}/runs/{runId}/analysis")
    public ResponseEntity<ApiResponse<RunAnalysis>> getAnalysis(
            @PathVariable Long repoId,
            @PathVariable Long runId) {

        PipelineRun run = pipelineRunRepository.findByIdWithRepository(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", runId));

        if (!run.getRepository().getId().equals(repoId)) {
            throw new ResourceNotFoundException("RunAnalysis not in this repository", runId);
        }

        RunAnalysis analysis = runAnalysisRepository
                .findByPipelineRunId(runId)
                .orElseThrow(() -> new ResourceNotFoundException("RunAnalysis", runId));

        return ResponseEntity.ok(ApiResponse.success(analysis));
    }

    @PostMapping("/{repoId}/runs/{runId}/analyse")
    public ResponseEntity<ApiResponse<String>> triggerAnalysis(
            @PathVariable Long repoId,
            @PathVariable Long runId) {

        log.info("Manual AI analysis triggered for runId={}", runId);

        PipelineRun run = pipelineRunRepository.findByIdWithRepository(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", runId));

        if (!run.getRepository().getId().equals(repoId)) {
            throw new ResourceNotFoundException("PipelineRun not in this repository", runId);
        }

        if (runAnalysisRepository.existsByPipelineRunId(runId)) {
            return ResponseEntity.ok(
                    ApiResponse.success("Analysis already exists for this run")
            );
        }

        RunAnalysis analysis = aiAnalysisClient.analyse(run);

        if (analysis != null) {
            runAnalysisRepository.save(analysis);

            log.info("AI analysis saved for runId={}, category={}",
                    runId, analysis.getCategory());

            return ResponseEntity.ok(
                    ApiResponse.success("Analysis complete - category: " + analysis.getCategory())
            );
        }

        log.error("AI analysis failed for runId={}", runId);

        return ResponseEntity.ok(
                ApiResponse.error("AI analysis failed — check AI service logs")
        );
    }

    // ===================== ANALYTICS =====================

    @GetMapping("/{id}/metrics")
    public ResponseEntity<ApiResponse<RepositoryMetricsDto>> getMetrics(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30d") String window) {

        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getRepositoryMetrics(id, window)
        ));
    }

    @GetMapping("/{id}/metrics/trend")
    public ResponseEntity<ApiResponse<List<TrendPointDto>>> getBuildTrend(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30d") String window) {

        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getBuildTrend(id, window)
        ));
    }

    @GetMapping("/{id}/flaky")
    public ResponseEntity<ApiResponse<List<FlakyWorkflowDto>>> getFlakyWorkflows(
            @PathVariable Long id,
            @RequestParam(defaultValue = "30d") String window) {

        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getFlakyWorkflows(id, window)
        ));
    }
}