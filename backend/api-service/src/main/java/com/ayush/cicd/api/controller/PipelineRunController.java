// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/PipelineRunController.java

package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.PagedResponse;
import com.ayush.cicd.api.dto.response.PipelineRunResponse;
import com.ayush.cicd.api.service.AuthorizationService;
import com.ayush.cicd.api.service.PipelineRunService;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;
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

/**
 * Pipeline run management APIs.
 *
 * SECURITY:
 * - repository ownership validation required
 * - authenticated user required
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/repositories/{repoId}")
@RequiredArgsConstructor
@Validated
@Tag(name = "Pipeline Runs", description = "Pipeline run management APIs")
public class PipelineRunController {

        private final GitHubIngestionService gitHubIngestionService;

        private final PipelineRunService pipelineRunService;

        private final AuthorizationService authorizationService;

        // ------------------------------------------------------------------------
        // Manual Repository Sync
        // ------------------------------------------------------------------------

        @PostMapping("/sync")
        @Operation(summary = "Trigger manual repository sync")
        public ResponseEntity<ApiResponse<String>> syncRepository(
                        @PathVariable Long repoId,
                        @AuthenticationPrincipal User currentUser) {

                // --------------------------------------------------------------------
                // Ownership validation
                // --------------------------------------------------------------------

                authorizationService.requireActiveRepoAccess(
                                repoId,
                                currentUser);

                log.info(
                                "Manual sync triggered for repositoryId={} by userId={}",
                                repoId,
                                currentUser.getId());

                int newRuns = gitHubIngestionService.syncRepository(repoId);

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                newRuns + " new runs ingested",
                                                "Repository sync completed successfully"));
        }

        // ------------------------------------------------------------------------
        // List Pipeline Runs
        // ------------------------------------------------------------------------

        @GetMapping("/runs")
        @Operation(summary = "Get repository pipeline runs")
        public ResponseEntity<ApiResponse<PagedResponse<PipelineRunResponse>>> getRepositoryRuns(

                        @PathVariable Long repoId,

                        @RequestParam(defaultValue = "0") @Min(value = 0, message = "Page must be >= 0") int page,

                        @RequestParam(defaultValue = "20") @Min(value = 1, message = "Size must be >= 1") @Max(value = 100, message = "Size cannot exceed 100") int size,

                        @AuthenticationPrincipal User currentUser) {

                authorizationService.requireActiveRepoAccess(
                                repoId,
                                currentUser);

                PagedResponse<PipelineRunResponse> runs = pipelineRunService.getRunsForRepository(
                                repoId,
                                page,
                                size);

                return ResponseEntity.ok(
                                ApiResponse.success(runs));
        }

        // ------------------------------------------------------------------------
        // Get Single Pipeline Run
        // ------------------------------------------------------------------------

        @GetMapping("/runs/{runId}")
        @Operation(summary = "Get pipeline run by id")
        public ResponseEntity<ApiResponse<PipelineRunResponse>> getPipelineRun(

                        @PathVariable Long repoId,

                        @PathVariable Long runId,

                        @AuthenticationPrincipal User currentUser) {

                // --------------------------------------------------------------------
                // Ownership + repo/run relation validation
                // --------------------------------------------------------------------

                authorizationService.requireRunAccess(
                                repoId,
                                runId,
                                currentUser);

                PipelineRunResponse pipelineRun = pipelineRunService.getRunById(runId);

                return ResponseEntity.ok(
                                ApiResponse.success(pipelineRun));
        }
}