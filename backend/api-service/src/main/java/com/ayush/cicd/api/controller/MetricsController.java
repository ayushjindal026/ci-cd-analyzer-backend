// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/controller/MetricsController.java

package com.ayush.cicd.api.controller;

import com.ayush.cicd.api.dto.response.RepoMetricsDto;
import com.ayush.cicd.api.service.AuthorizationService;
import com.ayush.cicd.api.service.MetricsAggregatorService;
import com.ayush.cicd.common.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Repository Metrics APIs.
 *
 * SECURITY:
 * - authenticated user required
 * - repository ownership validation required
 */
@RestController
@RequestMapping("/api/v1/repositories/{repoId}")
@RequiredArgsConstructor
@Validated
@Tag(name = "Repository Metrics", description = "Repository analytics and metrics APIs")
public class MetricsController {

    private final MetricsAggregatorService metricsAggregatorService;

    private final AuthorizationService authorizationService;

    // ------------------------------------------------------------------------
    // Repository Metrics
    // ------------------------------------------------------------------------

    @GetMapping("/metrics")
    @Operation(summary = "Get repository metrics")
    public ResponseEntity<RepoMetricsDto> getRepositoryMetrics(
            @PathVariable Long repoId,

            @RequestParam(defaultValue = "14") @Min(value = 1, message = "Days must be at least 1") @Max(value = 365, message = "Days cannot exceed 365") int days,

            @AuthenticationPrincipal User currentUser) {

        // --------------------------------------------------------------------
        // Ownership validation
        // --------------------------------------------------------------------

        authorizationService.requireActiveRepoAccess(
                repoId,
                currentUser);

        // --------------------------------------------------------------------
        // Aggregate metrics
        // --------------------------------------------------------------------

        RepoMetricsDto metrics = metricsAggregatorService.aggregate(
                repoId,
                days);

        return ResponseEntity.ok(metrics);
    }
}