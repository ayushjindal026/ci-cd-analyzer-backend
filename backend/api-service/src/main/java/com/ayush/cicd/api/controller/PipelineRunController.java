// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/PipelineRunController.java
package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.PagedResponse;
import com.ayush.cicd.api.dto.response.PipelineRunResponse;
import com.ayush.cicd.api.service.AuthorizationService;
import com.ayush.cicd.api.service.PipelineRunService;
import com.ayush.cicd.api.service.RepositoryService;
import com.ayush.cicd.common.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/repositories/{repoId}")
@RequiredArgsConstructor
@Validated
@Tag(name = "Pipeline Runs", description = "Pipeline run management APIs")
public class PipelineRunController {

        private final PipelineRunService pipelineRunService;
        private final RepositoryService repositoryService;
        private final AuthorizationService authorizationService;

        // ── Manual sync ───────────────────────────────────────────────────────────

        @PostMapping("/sync")
        @Operation(summary = "Trigger manual repository sync")
        public ResponseEntity<ApiResponse<String>> syncRepository(
                        @PathVariable Long repoId,
                        @AuthenticationPrincipal User currentUser) {

                authorizationService.requireActiveRepoAccess(repoId, currentUser);

                // RepositoryService.syncRepository handles ownership + delegates to ingestion
                int newRuns = repositoryService.syncRepository(repoId, currentUser);

                log.info("Manual sync: repoId={} userId={} newRuns={}",
                                repoId, currentUser.getId(), newRuns);

                return ResponseEntity.ok(
                                ApiResponse.success(newRuns + " new runs ingested"));
        }

        // ── List runs ─────────────────────────────────────────────────────────────

        @GetMapping("/runs")
        @Operation(summary = "Get paginated pipeline runs for a repository")
        public ResponseEntity<PagedResponse<PipelineRunResponse>> getRepositoryRuns(
                        @PathVariable Long repoId,
                        @RequestParam(defaultValue = "0") @Min(0) int page,
                        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
                        @AuthenticationPrincipal User currentUser) {

                authorizationService.requireActiveRepoAccess(repoId, currentUser);

                PagedResponse<PipelineRunResponse> runs = pipelineRunService.getRunsForRepository(repoId, page, size);

                // Return PagedResponse directly — NOT wrapped in ApiResponse
                // Frontend expects: { content: [...], totalElements, page, size }
                return ResponseEntity.ok(runs);
        }

        // ── Get single run ────────────────────────────────────────────────────────

        @GetMapping("/runs/{runId}")
        @Operation(summary = "Get a single pipeline run by ID")
        public ResponseEntity<PipelineRunResponse> getPipelineRun(
                        @PathVariable Long repoId,
                        @PathVariable Long runId,
                        @AuthenticationPrincipal User currentUser) {

                authorizationService.requireRunAccess(repoId, runId, currentUser);

                PipelineRunResponse run = pipelineRunService.getRunById(runId);
                return ResponseEntity.ok(run);
        }
}