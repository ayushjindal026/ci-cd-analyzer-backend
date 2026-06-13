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
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PipelineAnalysisOrchestrator {

        // ─────────────────────────────────────────────────────────────────────
        // DEPENDENCIES
        // ─────────────────────────────────────────────────────────────────────

        private final LogParserService logParser;

        private final FailureClassifierService classifier;

        private final AiAnalysisService aiService;

        private final PipelineRunRepository runRepo;

        private final RunAnalysisRepository analysisRepository;

        // ─────────────────────────────────────────────────────────────────────
        // MAIN ORCHESTRATION
        // ─────────────────────────────────────────────────────────────────────

        @Async("aiTaskExecutor")
        @Transactional
        public void orchestrate(
                        PipelineRun run,
                        MonitoredRepository repo,
                        Map<String, String> stageLogs) {

                log.info(
                                "Pipeline intelligence started — run={} repo={}",
                                run.getId(),
                                repo.getFullName());

                try {

                        FailureRecord primaryRecord = null;

                        String primaryStage = null;

                        String primaryLog = null;

                        // ─────────────────────────────────────────────────────────
                        // PARSE + CLASSIFY EACH STAGE
                        // ─────────────────────────────────────────────────────────

                        for (Map.Entry<String, String> entry : stageLogs.entrySet()) {

                                String stage = entry.getKey();

                                String rawLog = entry.getValue();

                                if (rawLog == null || rawLog.isBlank()) {
                                        continue;
                                }

                                ParsedLog parsed = logParser.parse(rawLog, stage);

                                if (!parsed.hasFailure()) {

                                        log.debug(
                                                        "No failure detected in stage={}",
                                                        stage);

                                        continue;
                                }

                                FailureRecord record = classifier.classify(run, parsed);

                                log.info(
                                                "Stage classified — stage={} category={} severity={}",
                                                stage,
                                                record.getCategory(),
                                                record.getSeverity());

                                // Select highest severity failure
                                if (primaryRecord == null
                                                || severityRank(record) > severityRank(primaryRecord)) {

                                        primaryRecord = record;

                                        primaryStage = stage;

                                        primaryLog = rawLog;
                                }
                        }

                        // ─────────────────────────────────────────────────────────
                        // NO FAILURES FOUND
                        // ─────────────────────────────────────────────────────────

                        if (primaryRecord == null) {

                                log.warn(
                                                "No actionable failures detected for run={}",
                                                run.getId());

                                updateAnalysisStatus(
                                                run,
                                                AnalysisStatus.SKIPPED);

                                return;
                        }

                        // ─────────────────────────────────────────────────────────
                        // HISTORICAL CONTEXT
                        // ─────────────────────────────────────────────────────────

                        FailureStats stats = classifier.getStats(
                                        run.getRepository().getId(),
                                        30);

                        log.info(
                                        "Invoking AI analysis — run={} stage={} category={}",
                                        run.getId(),
                                        primaryStage,
                                        primaryRecord.getCategory());

                        // ─────────────────────────────────────────────────────────
                        // AI ANALYSIS
                        // ─────────────────────────────────────────────────────────

                        RunAnalysis analysis = aiService.analyse(
                                        run.getRepository().getId(),
                                        run.getId(),
                                        primaryStage,
                                        primaryLog,
                                        stats);

                        // ─────────────────────────────────────────────────────────
                        // PERSIST FINAL ANALYSIS
                        // ─────────────────────────────────────────────────────────

                        RunAnalysis saved = analysisRepository.save(analysis);

                        log.info(
                                        "AI analysis persisted — analysisId={} run={}",
                                        saved.getId(),
                                        run.getId());


                        // ─────────────────────────────────────────────────────────
                        // SUCCESS
                        // ─────────────────────────────────────────────────────────

                        updateAnalysisStatus(
                                        run,
                                        AnalysisStatus.DONE);

                        log.info(
                                        "Pipeline intelligence completed successfully — run={}",
                                        run.getId());

                } catch (Exception ex) {

                        log.error(
                                        "Pipeline orchestration failed — run={} error={}",
                                        run.getId(),
                                        ex.getMessage(),
                                        ex);

                        updateAnalysisStatus(
                                        run,
                                        AnalysisStatus.FAILED);
                }
        }

        // ─────────────────────────────────────────────────────────────────────
        // STATUS MANAGEMENT
        // ─────────────────────────────────────────────────────────────────────

        private void updateAnalysisStatus(
                        PipelineRun run,
                        AnalysisStatus status) {

                run.setAnalysisStatus(status);

                runRepo.save(run);

                log.debug(
                                "Analysis status updated — run={} status={}",
                                run.getId(),
                                status);
        }

        // ─────────────────────────────────────────────────────────────────────
        // SEVERITY PRIORITY
        // ─────────────────────────────────────────────────────────────────────

        private int severityRank(
                        FailureRecord record) {

                if (record == null || record.getSeverity() == null) {
                        return 0;
                }

                return switch (record.getSeverity().toUpperCase()) {

                        case "CRITICAL" -> 4;

                        case "HIGH" -> 3;

                        case "MEDIUM" -> 2;

                        case "LOW" -> 1;

                        default -> 0;
                };
        }
}