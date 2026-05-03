package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.api.service.RepositoryService;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;
import com.ayush.cicd.api.dto.response.PagedResponse;
import com.ayush.cicd.api.dto.response.PipelineRunResponse;
import com.ayush.cicd.api.service.PipelineRunService;

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

    @GetMapping
    public ResponseEntity<ApiResponse<List<RepositoryResponse>>> getAllRepositories() {
        List<RepositoryResponse> repos = repositoryService.findAllActive();
        return ResponseEntity.ok(ApiResponse.success(repos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepositoryResponse>> getRepository(
            @PathVariable Long id) {

        RepositoryResponse repo = repositoryService.findById(id);
        return ResponseEntity.ok(ApiResponse.success(repo));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RepositoryResponse>> addRepository(
            @Valid @RequestBody AddRepositoryRequest request) {

        RepositoryResponse response = repositoryService.addRepository(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Repository added successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateRepository(
            @PathVariable Long id) {

        repositoryService.deactivateRepository(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Repository deactivated"));
    }

    @PostMapping("/{id}/sync")
    public ResponseEntity<ApiResponse<String>> syncRepository(@PathVariable Long id) {

        log.info("Manual sync triggered for repository id={}", id);

        int newRuns = gitHubIngestionService.syncRepository(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        newRuns + " new runs ingested",
                        "Sync completed"
                )
        );
    }

        /**
     * GET /api/v1/repositories/{id}/runs
     * Paginated run history for a repository, newest first.
     *
     * Query params:
     *   page — zero-based page number (default 0)
     *   size — results per page (default 20, max 100)
     *
     * Example: /api/v1/repositories/2/runs?page=0&size=10
     */
    @GetMapping("/{id}/runs")
    public ResponseEntity<ApiResponse<PagedResponse<PipelineRunResponse>>> getRunsForRepository(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PagedResponse<PipelineRunResponse> runs =
                pipelineRunService.getRunsForRepository(id, page, size);
        return ResponseEntity.ok(ApiResponse.success(runs));
    }

    /**
     * GET /api/v1/repositories/{repoId}/runs/{runId}
     * Single run detail — used for the run detail page showing AI analysis.
     */
    @GetMapping("/{repoId}/runs/{runId}")
    public ResponseEntity<ApiResponse<PipelineRunResponse>> getRun(
            @PathVariable Long repoId,
            @PathVariable Long runId) {
        PipelineRunResponse run = pipelineRunService.getRunById(runId);
        return ResponseEntity.ok(ApiResponse.success(run));
    }
}