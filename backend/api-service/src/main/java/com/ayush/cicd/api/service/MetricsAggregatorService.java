package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.response.*;
import com.ayush.cicd.common.entity.RunAnalysis;
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

        private final PipelineRunRepository runRepository;
        private final RunAnalysisRepository analysisRepository;
        private final FailureRecordRepository failureRepository;

        /**
         * Main metrics aggregation.
         */
        @Cacheable(value = "repoMetrics", key = "#repoId + '-' + #days")
        public RepoMetricsDto aggregate(
                        Long repoId,
                        int days) {

                Instant since = Instant.now()
                                .minusSeconds((long) days * 86_400L);

                long total = runRepository.countByRepository_IdAndStartedAtAfter(
                                repoId,
                                since);

                long success = runRepository.countByRepository_IdAndStatusAndStartedAtAfter(
                                repoId,
                                BuildStatus.SUCCESS,
                                since);

                long failed = runRepository.countByRepository_IdAndStatusAndStartedAtAfter(
                                repoId,
                                BuildStatus.FAILED,
                                since);

                long running = runRepository.countByRepository_IdAndStatus(
                                repoId,
                                BuildStatus.RUNNING);

                long pending = runRepository.countByRepository_IdAndStatus(
                                repoId,
                                BuildStatus.PENDING);

                Double avgMs = runRepository.avgDurationMsByRepositoryId(
                                repoId,
                                since);

                int avgSecs = avgMs != null
                                ? (int) (avgMs / 1000)
                                : 0;

                int successRate = total > 0
                                ? (int) ((success * 100) / total)
                                : 0;

                int failureRate = total > 0
                                ? (int) ((failed * 100) / total)
                                : 0;

                List<TrendPoint> trend = buildDailyTrend(repoId, days);

                List<StageDurationPoint> stageDurations = buildStageDurations(repoId, since);

                List<StatusCount> statusBreakdown = buildStatusBreakdown(
                                success,
                                failed,
                                running,
                                pending);

                long flakyCount = analysisRepository.countByRepositoryIdAndIsFlaky(
                                repoId,
                                true);

                log.debug(
                                "Metrics aggregated repo={} total={} success={} failed={}",
                                repoId,
                                total,
                                success,
                                failed);

                return RepoMetricsDto.builder()
                                .totalRuns((int) total)
                                .successfulRuns((int) success)
                                .failedRuns((int) failed)
                                .runningRuns((int) running)
                                .pendingRuns((int) pending)
                                .successRate(successRate)
                                .failureRate(failureRate)
                                .avgDuration(avgSecs)
                                .failureRateTrend(trend)
                                .stageDurations(stageDurations)
                                .statusBreakdown(statusBreakdown)
                                .flakyTestCount((int) flakyCount)
                                .windowDays(days)
                                .build();
        }

        /**
         * Cache eviction hook.
         */
        @CacheEvict(value = "repoMetrics", key = "#repoId + '-14'")
        public void evictMetrics(Long repoId) {

                log.debug(
                                "Evicted metrics cache for repo={}",
                                repoId);
        }

        /**
         * Repository AI analyses.
         */
        public List<RunAnalysis> getRepositoryAnalyses(
                        Long repoId) {

                return analysisRepository
                                .findTop50ByRepositoryIdOrderByAnalysedAtDesc(
                                                repoId);
        }

        // ------------------------------------------------------------------------
        // PRIVATE HELPERS
        // ------------------------------------------------------------------------

        private List<TrendPoint> buildDailyTrend(
                        Long repoId,
                        int days) {

                List<TrendPoint> points = new ArrayList<>();

                for (int i = days - 1; i >= 0; i--) {

                        Instant dayStart = Instant.now()
                                        .truncatedTo(ChronoUnit.DAYS)
                                        .minusSeconds((long) i * 86_400L);

                        Instant dayEnd = dayStart.plusSeconds(86_400L);

                        long success = runRepository
                                        .countByRepository_IdAndStatusAndStartedAtBetween(
                                                        repoId,
                                                        BuildStatus.SUCCESS,
                                                        dayStart,
                                                        dayEnd);

                        long failed = runRepository
                                        .countByRepository_IdAndStatusAndStartedAtBetween(
                                                        repoId,
                                                        BuildStatus.FAILED,
                                                        dayStart,
                                                        dayEnd);

                        long total = success + failed;

                        int failureRate = total > 0
                                        ? (int) ((failed * 100) / total)
                                        : 0;

                        points.add(
                                        new TrendPoint(
                                                        dayStart.toString().substring(0, 10),
                                                        failureRate,
                                                        100 - failureRate));
                }

                return points;
        }

        private List<StageDurationPoint> buildStageDurations(
                        Long repoId,
                        Instant since) {

                List<Object[]> rows = failureRepository.countByStage(
                                repoId,
                                since);

                return rows.stream()
                                .map(row -> new StageDurationPoint(
                                                (String) row[0],
                                                60,
                                                120))
                                .collect(Collectors.toList());
        }

        private List<StatusCount> buildStatusBreakdown(
                        long success,
                        long failed,
                        long running,
                        long pending) {

                List<StatusCount> result = new ArrayList<>();

                if (success > 0)
                        result.add(
                                        new StatusCount(
                                                        "Success",
                                                        (int) success));

                if (failed > 0)
                        result.add(
                                        new StatusCount(
                                                        "Failed",
                                                        (int) failed));

                if (running > 0)
                        result.add(
                                        new StatusCount(
                                                        "Running",
                                                        (int) running));

                if (pending > 0)
                        result.add(
                                        new StatusCount(
                                                        "Pending",
                                                        (int) pending));

                return result;
        }
}