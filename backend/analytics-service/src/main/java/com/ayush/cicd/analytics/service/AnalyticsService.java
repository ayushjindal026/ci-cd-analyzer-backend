package com.ayush.cicd.analytics.service;

import com.ayush.cicd.analytics.dto.*;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

        private final PipelineRunRepository runRepository;

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                        .withZone(ZoneOffset.UTC);

        /**
         * Computes aggregated metrics for a repository over a time window.
         *
         * WHY @Cacheable here?
         * This method runs multiple DB aggregation queries.
         * The dashboard calls this on every page load.
         * Caching for 15 minutes means the DB isn't hammered on every visit.
         * Cache is keyed by repoId + window — different windows cache separately.
         *
         * WHY load all runs into memory instead of pure SQL aggregation?
         * We need per-workflow breakdown AND overall stats in one response.
         * Doing this in pure SQL requires multiple queries or a complex GROUP BY.
         * Loading completed runs for a 30-day window is at most a few thousand
         * rows — perfectly fine in memory. If repos get millions of runs,
         * we switch to SQL aggregation at that point (premature optimisation avoided).
         */
        @Cacheable(value = "repositoryMetrics", key = "#repositoryId + '_' + #window")
        public RepositoryMetricsDto getRepositoryMetrics(Long repositoryId, String window) {
                log.debug("Computing metrics for repo={}, window={}", repositoryId, window);

                MetricsWindow metricsWindow = MetricsWindow.fromString(window);
                Instant since = computeSince(metricsWindow);

                // Load all completed runs in the window
                List<PipelineRun> runs = runRepository
                                .findByRepository_IdAndStartedAtAfterOrderByStartedAtAsc(repositoryId, since)
                                .stream()
                                .filter(r -> r.getStatus() != BuildStatus.RUNNING)
                                .collect(Collectors.toList());

                if (runs.isEmpty()) {
                        return emptyMetrics(repositoryId, window);
                }

                long total = runs.size();
                long successful = countByStatus(runs, BuildStatus.SUCCESS);
                long failed = countByStatus(runs, BuildStatus.FAILED);
                long cancelled = countByStatus(runs, BuildStatus.CANCELLED);

                OptionalDouble avgDurationOpt = runs.stream()
                                .filter(r -> r.getDurationMs() != null)
                                .mapToLong(PipelineRun::getDurationMs)
                                .average();

                Long avgDuration = avgDurationOpt.isPresent()
                                ? Math.round(avgDurationOpt.getAsDouble())
                                : null;

                Long maxDuration = runs.stream()
                                .filter(r -> r.getDurationMs() != null)
                                .mapToLong(PipelineRun::getDurationMs)
                                .max().isPresent()
                                                ? runs.stream().filter(r -> r.getDurationMs() != null)
                                                                .mapToLong(PipelineRun::getDurationMs).max().getAsLong()
                                                : null;

                Long minDuration = runs.stream()
                                .filter(r -> r.getDurationMs() != null)
                                .mapToLong(PipelineRun::getDurationMs)
                                .min().isPresent()
                                                ? runs.stream().filter(r -> r.getDurationMs() != null)
                                                                .mapToLong(PipelineRun::getDurationMs).min().getAsLong()
                                                : null;

                List<WorkflowMetricsDto> workflowBreakdown = computeWorkflowBreakdown(runs);

                return RepositoryMetricsDto.builder()
                                .repositoryId(repositoryId)
                                .window(window)
                                .totalRuns(total)
                                .successfulRuns(successful)
                                .failedRuns(failed)
                                .cancelledRuns(cancelled)
                                .successRate(rate(successful, total))
                                .failureRate(rate(failed, total))
                                .avgDurationMs(avgDuration)
                                .avgDurationFormatted(formatDuration(avgDuration))
                                .maxDurationMs(maxDuration)
                                .minDurationMs(minDuration)
                                .workflowBreakdown(workflowBreakdown)
                                .build();
        }

        /**
         * Detects flaky workflows — ones that FAIL then PASS on the same commit SHA.
         *
         * WHY compute flakiness here in Java instead of pure SQL?
         * The JPQL query in PipelineRunRepository.findFlakyRuns already does
         * the heavy lifting — it returns runs that match the FAIL→PASS pattern.
         * Grouping those by workflow and computing a score is cleaner in Java
         * than a complex SQL window function that's harder to read and test.
         */
        @Cacheable(value = "flakyWorkflows", key = "#repositoryId + '_' + #window")
        public List<FlakyWorkflowDto> getFlakyWorkflows(Long repositoryId, String window) {
                log.debug("Computing flaky workflows for repo={}, window={}", repositoryId, window);

                MetricsWindow metricsWindow = MetricsWindow.fromString(window);
                Instant since = computeSince(metricsWindow);

                // Runs that match the flaky pattern (FAIL followed by PASS on same SHA)
                List<PipelineRun> flakyRuns = runRepository.findFlakyRuns(repositoryId, since);

                // All runs in window — needed for denominator in flakiness score
                List<PipelineRun> allRuns = runRepository
                                .findByRepository_IdAndStartedAtAfterOrderByStartedAtAsc(repositoryId, since);

                // Group all runs by workflow for total count per workflow
                Map<String, Long> totalByWorkflow = allRuns.stream()
                                .collect(Collectors.groupingBy(
                                                PipelineRun::getWorkflowName, Collectors.counting()));

                // Group flaky runs by workflow
                Map<String, List<PipelineRun>> flakyByWorkflow = flakyRuns.stream()
                                .collect(Collectors.groupingBy(PipelineRun::getWorkflowName));

                return flakyByWorkflow.entrySet().stream()
                                .map(entry -> {
                                        String workflowName = entry.getKey();
                                        List<PipelineRun> workflowFlakyRuns = entry.getValue();
                                        long totalRuns = totalByWorkflow.getOrDefault(workflowName, 1L);
                                        long flakyCount = workflowFlakyRuns.size();

                                        Instant lastFlakyAt = workflowFlakyRuns.stream()
                                                        .map(PipelineRun::getStartedAt)
                                                        .filter(Objects::nonNull)
                                                        .max(Comparator.naturalOrder())
                                                        .orElse(null);

                                        return FlakyWorkflowDto.builder()
                                                        .workflowName(workflowName)
                                                        .totalRuns(totalRuns)
                                                        .flakyTransitions(flakyCount)
                                                        .flakinessScore(rate(flakyCount, totalRuns))
                                                        .lastFlakyAt(lastFlakyAt)
                                                        .build();
                                })
                                // Sort by flakiness score descending — worst offenders first
                                .sorted(Comparator.comparingDouble(FlakyWorkflowDto::getFlakinessScore).reversed())
                                .collect(Collectors.toList());
        }

        /**
         * Builds a daily trend of run counts for the last N days.
         * Each point in the list = one day.
         * Used for the build volume chart on the dashboard.
         */
        @Cacheable(value = "buildTrend", key = "#repositoryId + '_' + #window")
        public List<TrendPointDto> getBuildTrend(Long repositoryId, String window) {
                log.debug("Computing build trend for repo={}, window={}", repositoryId, window);

                MetricsWindow metricsWindow = MetricsWindow.fromString(window);
                Instant since = computeSince(metricsWindow);

                List<PipelineRun> runs = runRepository
                                .findByRepository_IdAndStartedAtAfterOrderByStartedAtAsc(repositoryId, since);

                // Group runs by date string
                Map<String, List<PipelineRun>> runsByDate = runs.stream()
                                .filter(r -> r.getStartedAt() != null)
                                .collect(Collectors.groupingBy(
                                                r -> DATE_FORMATTER.format(r.getStartedAt())));

                // Build a point for every day in the window (including days with 0 runs)
                // WHY fill gaps? A chart with missing days looks broken.
                // Explicitly inserting 0-count days gives a continuous X axis.
                List<TrendPointDto> trend = new ArrayList<>();
                int days = metricsWindow == MetricsWindow.ALL_TIME ? 30 : metricsWindow.getDays();

                for (int i = days - 1; i >= 0; i--) {
                        Instant day = Instant.now().minus(i, ChronoUnit.DAYS);
                        String dateKey = DATE_FORMATTER.format(day);
                        List<PipelineRun> dayRuns = runsByDate.getOrDefault(dateKey, List.of());

                        trend.add(TrendPointDto.builder()
                                        .date(dateKey)
                                        .totalRuns(dayRuns.size())
                                        .successfulRuns(countByStatus(dayRuns, BuildStatus.SUCCESS))
                                        .failedRuns(countByStatus(dayRuns, BuildStatus.FAILED))
                                        .build());
                }

                return trend;
        }

        // ── Private helpers ──────────────────────────────────────────────────────

        private Instant computeSince(MetricsWindow window) {
                if (window == MetricsWindow.ALL_TIME) {
                        return Instant.EPOCH; // beginning of time
                }
                return Instant.now().minus(window.getDays(), ChronoUnit.DAYS);
        }

        private long countByStatus(List<PipelineRun> runs, BuildStatus status) {
                return runs.stream().filter(r -> r.getStatus() == status).count();
        }

        private double rate(long part, long total) {
                if (total == 0)
                        return 0.0;
                return BigDecimal.valueOf((double) part / total * 100)
                                .setScale(2, RoundingMode.HALF_UP)
                                .doubleValue();
        }

        private String formatDuration(Long durationMs) {
                if (durationMs == null || durationMs <= 0)
                        return "N/A";
                long totalSeconds = durationMs / 1000;
                long minutes = totalSeconds / 60;
                long seconds = totalSeconds % 60;
                return minutes == 0 ? seconds + "s" : minutes + "m " + seconds + "s";
        }

        private List<WorkflowMetricsDto> computeWorkflowBreakdown(List<PipelineRun> runs) {
                Map<String, List<PipelineRun>> byWorkflow = runs.stream()
                                .collect(Collectors.groupingBy(PipelineRun::getWorkflowName));

                return byWorkflow.entrySet().stream()
                                .map(entry -> {
                                        String name = entry.getKey();
                                        List<PipelineRun> wRuns = entry.getValue();
                                        long total = wRuns.size();
                                        long successful = countByStatus(wRuns, BuildStatus.SUCCESS);
                                        long failed = countByStatus(wRuns, BuildStatus.FAILED);

                                        OptionalDouble avg = wRuns.stream()
                                                        .filter(r -> r.getDurationMs() != null)
                                                        .mapToLong(PipelineRun::getDurationMs)
                                                        .average();
                                        Long avgMs = avg.isPresent() ? Math.round(avg.getAsDouble()) : null;

                                        return WorkflowMetricsDto.builder()
                                                        .workflowName(name)
                                                        .totalRuns(total)
                                                        .successfulRuns(successful)
                                                        .failedRuns(failed)
                                                        .successRate(rate(successful, total))
                                                        .avgDurationMs(avgMs)
                                                        .avgDurationFormatted(formatDuration(avgMs))
                                                        .build();
                                })
                                .sorted(Comparator.comparing(WorkflowMetricsDto::getWorkflowName))
                                .collect(Collectors.toList());
        }

        private RepositoryMetricsDto emptyMetrics(Long repositoryId, String window) {
                return RepositoryMetricsDto.builder()
                                .repositoryId(repositoryId)
                                .window(window)
                                .totalRuns(0)
                                .successfulRuns(0)
                                .failedRuns(0)
                                .cancelledRuns(0)
                                .successRate(0.0)
                                .failureRate(0.0)
                                .workflowBreakdown(List.of())
                                .build();
        }
}