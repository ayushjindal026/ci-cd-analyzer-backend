package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.AnalysisStatus;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.service.FailureClassifierService.FailureStats;
import com.ayush.cicd.ingestion.service.LogParserService.ParsedLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PipelineAnalysisOrchestrator {

    private final LogParserService logParser;
    private final FailureClassifierService classifier;
    private final AiAnalysisService aiService;
    private final PipelineRunRepository runRepo;
    private final RunAnalysisRepository analysisRepository;

    // ─────────────────────────────────────────────────────────────────────
    // MAIN ORCHESTRATION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Runs the pipeline intelligence workflow asynchronously.
     *
     * Responsibility:
     * - manage analysis lifecycle
     * - parse/classify stages
     * - select primary failure
     * - invoke AI service
     * - persist final RunAnalysis
     * - update PipelineRun.analysisStatus
     *
     * AiAnalysisService does not persist or manage status.
     */
    @Async("aiTaskExecutor")
    public void orchestrate(
            PipelineRun run,
            MonitoredRepository repo,
            Map<String, String> stageLogs) {

        Long runId = run.getId();

        log.info(
                "Pipeline intelligence started — run={} repo={}",
                runId,
                repo.getFullName());

        try {

            // ─────────────────────────────────────────────────────────────
            // VALIDATE INPUT
            // ─────────────────────────────────────────────────────────────

            if (stageLogs == null || stageLogs.isEmpty()) {

                log.warn(
                        "No stage logs available for run={}",
                        runId);

                /*
                 * This should normally be handled by GitHubLogFetcherService
                 * as LOGS_UNAVAILABLE. This guard prevents an empty map from
                 * being treated as a successful analysis.
                 */
                updateAnalysisStatus(
                        runId,
                        AnalysisStatus.LOGS_UNAVAILABLE);

                return;
            }

            // ─────────────────────────────────────────────────────────────
            // START
            // ─────────────────────────────────────────────────────────────

            updateAnalysisStatus(
                    runId,
                    AnalysisStatus.IN_PROGRESS);

            // ─────────────────────────────────────────────────────────────
            // FIND PRIMARY FAILURE
            // ─────────────────────────────────────────────────────────────

            FailureRecord primaryRecord = null;
            String primaryStage = null;
            String primaryLog = null;

            for (Map.Entry<String, String> entry
                    : stageLogs.entrySet()) {

                String stage = entry.getKey();
                String rawLog = entry.getValue();

                if (rawLog == null || rawLog.isBlank()) {

                    log.debug(
                            "Skipping empty log — run={} stage={}",
                            runId,
                            stage);

                    continue;
                }

                ParsedLog parsed =
                        logParser.parse(
                                rawLog,
                                stage);

                if (!parsed.hasFailure()) {

                    log.debug(
                            "No failure detected — run={} stage={}",
                            runId,
                            stage);

                    continue;
                }

                FailureRecord record =
                        classifier.classify(
                                run,
                                parsed);

                log.info(
                        "Stage classified — run={} stage={} category={} severity={}",
                        runId,
                        stage,
                        record.getCategory(),
                        record.getSeverity());

                if (primaryRecord == null
                        || severityRank(record)
                        > severityRank(primaryRecord)) {

                    primaryRecord = record;
                    primaryStage = stage;
                    primaryLog = rawLog;
                }
            }

            // ─────────────────────────────────────────────────────────────
            // NO ACTIONABLE FAILURE
            // ─────────────────────────────────────────────────────────────

            if (primaryRecord == null) {

                log.info(
                        "No actionable failures detected — run={}",
                        runId);

                updateAnalysisStatus(
                        runId,
                        AnalysisStatus.SKIPPED);

                return;
            }

            // ─────────────────────────────────────────────────────────────
            // HISTORICAL CONTEXT
            // ─────────────────────────────────────────────────────────────

            FailureStats stats =
                    classifier.getStats(
                            run.getRepository().getId(),
                            30);

            log.info(
                    "Primary failure selected — run={} stage={} category={} severity={}",
                    runId,
                    primaryStage,
                    primaryRecord.getCategory(),
                    primaryRecord.getSeverity());

            // ─────────────────────────────────────────────────────────────
            // AI ANALYSIS
            // ─────────────────────────────────────────────────────────────

            RunAnalysis analysis =
                    aiService.analyse(
                            run.getRepository().getId(),
                            runId,
                            primaryStage,
                            primaryLog,
                            stats);

            if (analysis == null) {

                throw new IllegalStateException(
                        "AI analysis returned null for run="
                                + runId);
            }

            // ─────────────────────────────────────────────────────────────
            // PERSIST
            // ─────────────────────────────────────────────────────────────

            RunAnalysis saved =
                    analysisRepository.save(
                            analysis);

            log.info(
                    "AI analysis persisted — analysisId={} run={} model={}",
                    saved.getId(),
                    runId,
                    saved.getModelUsed());

            // ─────────────────────────────────────────────────────────────
            // SUCCESS
            // ─────────────────────────────────────────────────────────────

            updateAnalysisStatus(
                    runId,
                    AnalysisStatus.DONE);

            log.info(
                    "Pipeline intelligence completed successfully — run={}",
                    runId);

        } catch (Exception ex) {

            log.error(
                    "Pipeline orchestration failed — run={} error={}",
                    runId,
                    ex.getMessage(),
                    ex);

            /*
             * At this point the failure was not recoverable by the AI
             * service's fallback behavior.
             */
            updateAnalysisStatus(
                    runId,
                    AnalysisStatus.FAILED);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // STATUS MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────

    private void updateAnalysisStatus(
            Long runId,
            AnalysisStatus status) {

        try {

            PipelineRun managedRun =
                    runRepo.findById(runId)
                            .orElseThrow(
                                    () -> new IllegalStateException(
                                            "PipelineRun not found: "
                                                    + runId));

            managedRun.setAnalysisStatus(status);

            runRepo.save(managedRun);

            log.debug(
                    "Analysis status updated — run={} status={}",
                    runId,
                    status);

        } catch (Exception ex) {

            /*
             * Status persistence must never hide the original analysis
             * exception. Log it explicitly.
             */
            log.error(
                    "Failed to update analysis status — run={} status={}",
                    runId,
                    status,
                    ex);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // SEVERITY
    // ─────────────────────────────────────────────────────────────────────

    private int severityRank(
            FailureRecord record) {

        if (record == null
                || record.getSeverity() == null) {

            return 0;
        }

        return switch (
                record.getSeverity().toUpperCase()) {

            case "CRITICAL" -> 4;
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            case "LOW" -> 1;

            default -> 0;
        };
    }
}