// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/RepositoryController.java

package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.ApiResponse;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.api.service.RepositoryService;
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

/**
 * Repository Management APIs.
 *
 * RESPONSIBILITIES:
 * - add monitored repositories
 * - fetch repositories
 * - deactivate repositories
 *
 * SECURITY:
 * - all operations scoped to authenticated user
 * - ownership enforced inside RepositoryService
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Repositories", description = "Repository management APIs")
public class RepositoryController {

        private final RepositoryService repositoryService;

        // ------------------------------------------------------------------------
        // List Repositories
        // ------------------------------------------------------------------------

        @GetMapping
        @Operation(summary = "Get all repositories for current user")
        public ResponseEntity<ApiResponse<List<RepositoryResponse>>> getRepositories(
                        @AuthenticationPrincipal User currentUser) {

                List<RepositoryResponse> repositories = repositoryService.findAllActiveForUser(
                                currentUser);

                return ResponseEntity.ok(
                                ApiResponse.success(repositories));
        }

        // ------------------------------------------------------------------------
        // Get Repository
        // ------------------------------------------------------------------------

        @GetMapping("/{repositoryId}")
        @Operation(summary = "Get repository by id")
        public ResponseEntity<ApiResponse<RepositoryResponse>> getRepository(
                        @PathVariable Long repositoryId,
                        @AuthenticationPrincipal User currentUser) {

                RepositoryResponse repository = repositoryService.findByIdForUser(
                                repositoryId,
                                currentUser);

                return ResponseEntity.ok(
                                ApiResponse.success(repository));
        }

        // ------------------------------------------------------------------------
        // Add Repository
        // ------------------------------------------------------------------------

        @PostMapping
        @Operation(summary = "Add repository for monitoring")
        public ResponseEntity<ApiResponse<RepositoryResponse>> addRepository(
                        @Valid @RequestBody AddRepositoryRequest request,
                        @AuthenticationPrincipal User currentUser) {

                log.info(
                                "Adding repository for userId={}",
                                currentUser.getId());

                RepositoryResponse createdRepository = repositoryService.addRepository(
                                request,
                                currentUser);

                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(
                                                ApiResponse.success(
                                                                createdRepository,
                                                                "Repository added successfully"));
        }

        // ------------------------------------------------------------------------
        // Deactivate Repository
        // ------------------------------------------------------------------------

        /**
         * Soft delete.
         *
         * Repository remains persisted but marked inactive.
         */
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