// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/AnalysisController.java

package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.service.AuthorizationService;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.service.GitHubLogFetcherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AI Pipeline Analysis APIs.
 *
 * SECURITY:
 * Every endpoint validates:
 * - authenticated user
 * - repository ownership
 * - pipeline run ownership
 */
@RestController
@RequestMapping("/api/v1/repositories/{repoId}")
@RequiredArgsConstructor
@Tag(name = "Pipeline Analysis", description = "AI-powered pipeline analysis APIs")
public class AnalysisController {

    private final GitHubLogFetcherService gitHubLogFetcherService;

    private final RunAnalysisRepository runAnalysisRepository;

    private final AuthorizationService authorizationService;

    // ------------------------------------------------------------------------
    // Trigger Analysis
    // ------------------------------------------------------------------------

    @PostMapping("/runs/{runId}/analysis")
    @Operation(summary = "Trigger AI analysis for pipeline run")
    public ResponseEntity<Void> triggerAnalysis(
            @PathVariable Long repoId,
            @PathVariable Long runId,
            @AuthenticationPrincipal User currentUser) {

        // --------------------------------------------------------------------
        // Ownership validation
        // --------------------------------------------------------------------

        authorizationService.requireRunAccess(
                repoId,
                runId,
                currentUser);

        // --------------------------------------------------------------------
        // Trigger analysis
        // --------------------------------------------------------------------

        gitHubLogFetcherService.fetchAndAnalyse(
                repoId,
                runId);

        return ResponseEntity.accepted().build();
    }

    // ------------------------------------------------------------------------
    // Get Single Analysis
    // ------------------------------------------------------------------------

    @GetMapping("/runs/{runId}/analysis")
    @Operation(summary = "Get AI analysis result")
    public ResponseEntity<RunAnalysis> getAnalysis(
            @PathVariable Long repoId,
            @PathVariable Long runId,
            @AuthenticationPrincipal User currentUser) {

        authorizationService.requireRunAccess(
                repoId,
                runId,
                currentUser);

        return runAnalysisRepository.findByRunId(runId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ------------------------------------------------------------------------
    // List Repository Analyses
    // ------------------------------------------------------------------------

    @GetMapping("/analyses")
    @Operation(summary = "Get all repository analyses")
    public ResponseEntity<List<RunAnalysis>> getRepositoryAnalyses(
            @PathVariable Long repoId,
            @AuthenticationPrincipal User currentUser) {

        authorizationService.requireActiveRepoAccess(
                repoId,
                currentUser);

        List<RunAnalysis> analyses = runAnalysisRepository
                .findByRepositoryIdOrderByAnalysedAtDesc(
                        repoId);

        return ResponseEntity.ok(analyses);
    }

    // ------------------------------------------------------------------------
    // Get Flaky Analyses
    // ------------------------------------------------------------------------

    @GetMapping("/analyses/flaky")
    @Operation(summary = "Get flaky pipeline analyses")
    public ResponseEntity<List<RunAnalysis>> getFlakyAnalyses(
            @PathVariable Long repoId,
            @AuthenticationPrincipal User currentUser) {

        authorizationService.requireActiveRepoAccess(
                repoId,
                currentUser);

        List<RunAnalysis> flakyAnalyses = runAnalysisRepository
                .findByRepositoryIdAndIsFlaky(
                        repoId,
                        true);

        return ResponseEntity.ok(flakyAnalyses);
    }
}