package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.response.*;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.repository.FailureRecordRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricsAggregatorService {

    private final PipelineRunRepository runRepo;
    private final FailureRecordRepository failureRepo;
    private final RunAnalysisRepository analysisRepo;

    // =========================================================================
    // MAIN METRICS AGGREGATION
    // =========================================================================

    @Cacheable(
            value = "repoMetrics",
            key = "#repoId + '-' + #days",
            unless = "#result == null"
    )
    public RepoMetricsDto aggregate(Long repoId, int days) {

        Instant since = Instant.now()
                .minus(days, ChronoUnit.DAYS);

        // ─────────────────────────────────────────────────────────────────────
        // RUN COUNTS
        // ─────────────────────────────────────────────────────────────────────

        long success = runRepo.countByRepositoryIdAndStatusSince(
                repoId,
                BuildStatus.SUCCESS,
                since
        );

        long failed = runRepo.countByRepositoryIdAndStatusSince(
                repoId,
                BuildStatus.FAILED,
                since
        );

        long running = runRepo.countByRepositoryIdAndStatusSince(
                repoId,
                BuildStatus.RUNNING,
                since
        );

        long pending = runRepo.countByRepositoryIdAndStatusSince(
                repoId,
                BuildStatus.QUEUED,
                since
        );

        long total = success + failed + running + pending;

        // ─────────────────────────────────────────────────────────────────────
        // SUCCESS / FAILURE RATE
        // ─────────────────────────────────────────────────────────────────────

        int successRate = total > 0
                ? (int) ((success * 100.0) / total)
                : 0;

        int failureRate = total > 0
                ? (int) ((failed * 100.0) / total)
                : 0;

        // ─────────────────────────────────────────────────────────────────────
        // AVERAGE DURATION
        // ─────────────────────────────────────────────────────────────────────

        Double avgDuration = runRepo.avgDurationSince(
                repoId,
                since
        );

        // ─────────────────────────────────────────────────────────────────────
        // TREND CHART
        // ─────────────────────────────────────────────────────────────────────

        List<TrendPoint> trend =
                buildTrend(repoId, days);

        // ─────────────────────────────────────────────────────────────────────
        // STAGE DURATIONS
        // ─────────────────────────────────────────────────────────────────────

        List<StageDurationPoint> stageDurations =
                buildStageDurations(repoId, since);

        // ─────────────────────────────────────────────────────────────────────
        // STATUS BREAKDOWN
        // ─────────────────────────────────────────────────────────────────────

        List<StatusCount> statusBreakdown = List.of(
                new StatusCount("Success", (int) success),
                new StatusCount("Failed", (int) failed),
                new StatusCount("Running", (int) running),
                new StatusCount("Pending", (int) pending)
        );

        // ─────────────────────────────────────────────────────────────────────
        // FLAKY ANALYSIS
        // ─────────────────────────────────────────────────────────────────────

        long flakyCount =
                analysisRepo.findByRepositoryIdAndIsFlaky(repoId, true)
                        .size();

        log.debug(
                "Metrics aggregated repoId={} total={} success={} failed={}",
                repoId,
                total,
                success,
                failed
        );

        return RepoMetricsDto.builder()
                .totalRuns((int) total)
                .successfulRuns((int) success)
                .failedRuns((int) failed)
                .runningRuns((int) running)
                .pendingRuns((int) pending)
                .successRate(successRate)
                .failureRate(failureRate)
                .avgDuration(avgDuration != null
                        ? avgDuration.intValue()
                        : 0)
                .failureRateTrend(trend)
                .stageDurations(stageDurations)
                .statusBreakdown(statusBreakdown)
                .flakyTestCount((int) flakyCount)
                .windowDays(days)
                .build();
    }

    // =========================================================================
    // CACHE INVALIDATION
    // =========================================================================

    @CacheEvict(
            value = "repoMetrics",
            allEntries = true
    )
    public void evictMetrics(Long repoId) {

        log.debug(
                "Evicted metrics cache for repoId={}",
                repoId
        );
    }

    // =========================================================================
    // TREND GENERATION
    // =========================================================================

    private List<TrendPoint> buildTrend(
            Long repoId,
            int days
    ) {

        List<TrendPoint> points = new ArrayList<>();

        for (int i = days - 1; i >= 0; i--) {

            Instant dayStart = Instant.now()
                    .truncatedTo(ChronoUnit.DAYS)
                    .minus(i, ChronoUnit.DAYS);

            Instant dayEnd = dayStart.plus(1, ChronoUnit.DAYS);

            long success =
                    runRepo.countByRepository_IdAndStatusAndStartedAtBetween(
                            repoId,
                            BuildStatus.SUCCESS,
                            dayStart,
                            dayEnd
                    );

            long failed =
                    runRepo.countByRepository_IdAndStatusAndStartedAtBetween(
                            repoId,
                            BuildStatus.FAILED,
                            dayStart,
                            dayEnd
                    );

            long total = success + failed;

            int failureRate = total > 0
                    ? (int) ((failed * 100.0) / total)
                    : 0;

            points.add(
                    new TrendPoint(
                            dayStart.toString().substring(0, 10),
                            failureRate,
                            100 - failureRate
                    )
            );
        }

        return points;
    }

    // =========================================================================
    // STAGE DURATIONS
    // =========================================================================

    private List<StageDurationPoint> buildStageDurations(
            Long repoId,
            Instant since
    ) {

        List<Object[]> byStage =
                failureRepo.countByStage(repoId, since);

        return byStage.stream()
                .map(row -> new StageDurationPoint(
                        (String) row[0],
                        60,
                        120
                ))
                .collect(Collectors.toList());
    }
}