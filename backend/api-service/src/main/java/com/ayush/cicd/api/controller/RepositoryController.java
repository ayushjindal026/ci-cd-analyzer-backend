package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.RepoMetricsDto;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.api.service.AuthorizationService;
import com.ayush.cicd.api.service.MetricsAggregatorService;
import com.ayush.cicd.api.service.RepositoryService;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.entity.User;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Repositories", description = "Repository management APIs")
public class RepositoryController {

        private final RepositoryService repositoryService;

        private final MetricsAggregatorService metricsAggregatorService;

        private final AuthorizationService authorizationService;

        // ─────────────────────────────────────────────────────────
        // LIST REPOSITORIES
        // ─────────────────────────────────────────────────────────

        @GetMapping
        public ResponseEntity<ApiResponse<List<RepositoryResponse>>> getRepositories(
                        @AuthenticationPrincipal User currentUser) {

                List<RepositoryResponse> repositories = repositoryService.findAllActiveForUser(currentUser);

                return ResponseEntity.ok(ApiResponse.success(repositories));
        }

        // ─────────────────────────────────────────────────────────
        // GET REPOSITORY
        // ─────────────────────────────────────────────────────────

        @GetMapping("/{repositoryId}")
        @Operation(summary = "Get repository by id")
        public ResponseEntity<ApiResponse<RepositoryResponse>> getRepository(
                        @PathVariable Long repositoryId,
                        @AuthenticationPrincipal User currentUser) {

                RepositoryResponse repository = repositoryService.findByIdForUser(repositoryId, currentUser);

                return ResponseEntity.ok(
                                ApiResponse.success(repository));
        }

        // ─────────────────────────────────────────────────────────
        // ADD REPOSITORY
        // ─────────────────────────────────────────────────────────

        @PostMapping
        @Operation(summary = "Add repository for monitoring")
        public ResponseEntity<ApiResponse<RepositoryResponse>> addRepository(
                        @Valid @RequestBody AddRepositoryRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info(
                                "Adding repository for userId={}",
                                currentUser.getId());

                RepositoryResponse createdRepository = repositoryService.addRepository(request, currentUser);

                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(ApiResponse.success(
                                                createdRepository,
                                                "Repository added successfully"));
        }

        // ─────────────────────────────────────────────────────────
        // DEACTIVATE REPOSITORY
        // ─────────────────────────────────────────────────────────

        @DeleteMapping("/{repositoryId}")
        @Operation(summary = "Deactivate repository")
        public ResponseEntity<ApiResponse<Void>> deactivateRepository(
                        @PathVariable Long repositoryId,
                        @AuthenticationPrincipal User currentUser) {

                repositoryService.deactivateRepository(
                                repositoryId,
                                currentUser);

                log.info(
                                "Repository {} deactivated by userId={}",
                                repositoryId,
                                currentUser.getId());

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                null,
                                                "Repository deactivated successfully"));
        }
}