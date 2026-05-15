package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.AnalysisStatus;
import com.ayush.cicd.common.repository.PipelineRunRepository;
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

        private final LogParserService logParser;

        private final FailureClassifierService classifier;

        // IMPORTANT:
        // AiAnalysisService should ideally be a client later
        private final AiAnalysisService aiService;

        private final PipelineRunRepository runRepo;

        // =====================================================
        // Main Orchestration
        // =====================================================

        @Async("aiTaskExecutor")
        @Transactional
        public void orchestrate(
                        PipelineRun run,
                        MonitoredRepository repo,
                        Map<String, String> stageLogs) {

                log.info(
                                "Intelligence pipeline started — run={} repo={}",
                                run.getId(),
                                repo.getFullName());

                try {

                        FailureRecord primaryRecord = null;

                        String primaryStage = null;

                        String primaryLog = null;

                        // =================================================
                        // Parse each stage
                        // =================================================

                        for (Map.Entry<String, String> entry : stageLogs.entrySet()) {

                                String stage = entry.getKey();

                                String rawLog = entry.getValue();

                                ParsedLog parsed = logParser.parse(rawLog, stage);

                                if (!parsed.hasFailure()) {
                                        continue;
                                }

                                FailureRecord record = classifier.classify(run, parsed);

                                log.debug(
                                                "Classified stage={} category={} severity={}",
                                                stage,
                                                record.getCategory(),
                                                record.getSeverity());

                                // Select most severe failure
                                if (primaryRecord == null
                                                || severityRank(record) > severityRank(primaryRecord)) {

                                        primaryRecord = record;

                                        primaryStage = stage;

                                        primaryLog = rawLog;
                                }
                        }

                        // =================================================
                        // No failures found
                        // =================================================

                        if (primaryRecord == null) {

                                log.warn(
                                                "No failure detected in logs for run {}",
                                                run.getId());

                                updateAnalysisStatus(
                                                run,
                                                AnalysisStatus.SKIPPED);

                                return;
                        }

                        // =================================================
                        // Historical statistics
                        // =================================================

                        FailureStats stats = classifier.getStats(
                                        run.getRepository().getId(),
                                        30);

                        log.info(
                                        "Calling AI — run={} stage={} category={}",
                                        run.getId(),
                                        primaryStage,
                                        primaryRecord.getCategory());

                        // =================================================
                        // AI Analysis
                        // =================================================

                        aiService.analyse(
                                        run.getRepository().getId(),
                                        run.getId(),
                                        primaryStage,
                                        primaryLog,
                                        stats);

                        // =================================================
                        // Success
                        // =================================================

                        updateAnalysisStatus(
                                        run,
                                        AnalysisStatus.DONE);

                        log.info(
                                        "Intelligence pipeline complete — run={}",
                                        run.getId());

                } catch (Exception e) {

                        log.error(
                                        "Orchestration error for run {}: {}",
                                        run.getId(),
                                        e.getMessage(),
                                        e);

                        updateAnalysisStatus(
                                        run,
                                        AnalysisStatus.FAILED);
                }
        }

        // =====================================================
        // Update Analysis Status
        // =====================================================

        private void updateAnalysisStatus(
                        PipelineRun run,
                        AnalysisStatus status) {

                run.setAnalysisStatus(status);

                runRepo.save(run);
        }

        // =====================================================
        // Severity Ranking
        // =====================================================

        private int severityRank(
                        FailureRecord record) {

                return switch (record.getSeverity() == null
                                ? ""
                                : record.getSeverity().toUpperCase()) {

                        case "CRITICAL" -> 4;

                        case "HIGH" -> 3;

                        case "MEDIUM" -> 2;

                        case "LOW" -> 1;

                        default -> 0;
                };
        }
}