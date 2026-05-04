package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.client.AiAnalysisClient;
import com.ayush.cicd.ingestion.client.GitHubActionsClient;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunsResponse;
import com.ayush.cicd.ingestion.mapper.GitHubRunMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class GitHubIngestionService {

    private final GitHubActionsClient gitHubActionsClient;
    private final GitHubRunMapper mapper;
    private final MonitoredRepositoryRepository repositoryRepository;
    private final PipelineRunRepository pipelineRunRepository;
    private final RunAnalysisRepository runAnalysisRepository;
    private final AiAnalysisClient aiAnalysisClient;

    @Caching(evict = {
        @CacheEvict(value = "repositoryMetrics", key = "#repositoryId + '_7d'"),
        @CacheEvict(value = "repositoryMetrics", key = "#repositoryId + '_30d'"),
        @CacheEvict(value = "repositoryMetrics", key = "#repositoryId + '_all'"),
        @CacheEvict(value = "flakyWorkflows",    key = "#repositoryId + '_7d'"),
        @CacheEvict(value = "flakyWorkflows",    key = "#repositoryId + '_30d'"),
        @CacheEvict(value = "buildTrend",        key = "#repositoryId + '_7d'"),
        @CacheEvict(value = "buildTrend",        key = "#repositoryId + '_30d'")
    })
    @Transactional
    public int syncRepository(Long repositoryId) {
        MonitoredRepository repository = repositoryRepository.findById(repositoryId)
                .orElseThrow(() -> new RuntimeException(
                        "Repository not found with id: " + repositoryId));

        log.info("Starting sync for {}/{} (id={})",
                repository.getOwner(), repository.getRepoName(), repositoryId);

        Instant since = repository.getLastSyncedAt();

        GitHubWorkflowRunsResponse response = gitHubActionsClient.fetchWorkflowRuns(
                repository.getOwner(), repository.getRepoName(), since);

        if (response == null || response.getWorkflowRuns() == null
                || response.getWorkflowRuns().isEmpty()) {
            log.info("No new runs found for {}/{}",
                    repository.getOwner(), repository.getRepoName());
            updateLastSyncedAt(repository);
            return 0;
        }

        List<PipelineRun> newRuns = new ArrayList<>();

        for (GitHubWorkflowRunDto dto : response.getWorkflowRuns()) {
            String externalId = String.valueOf(dto.getId());
            boolean alreadyExists = pipelineRunRepository
                    .findByRepositoryIdAndExternalRunId(repositoryId, externalId)
                    .isPresent();
            if (alreadyExists) {
                log.debug("Run {} already exists, skipping", externalId);
                continue;
            }
            newRuns.add(mapper.toPipelineRun(dto, repository));
        }

        if (!newRuns.isEmpty()) {
            pipelineRunRepository.saveAll(newRuns);
            log.info("Saved {} new runs for {}/{}",
                    newRuns.size(), repository.getOwner(), repository.getRepoName());

            // Trigger AI analysis for each failed run
            analyseFailedRuns(newRuns);
        }

        updateLastSyncedAt(repository);
        return newRuns.size();
    }

    /**
     * WHY a separate method and not inline in the loop above?
     * Analysis runs AFTER all runs are saved and committed.
     * If analysis fails for one run, it must not roll back the saved runs.
     * Separating it makes the transactional boundary clear.
     *
     * WHY not @Async here?
     * For now, sync analysis is fine — only a few failed runs per sync.
     * We add @Async in Week 4 when we have many repos and need parallelism.
     */
    private void analyseFailedRuns(List<PipelineRun> runs) {
        List<PipelineRun> failedRuns = runs.stream()
                .filter(r -> r.getStatus() == BuildStatus.FAILURE)
                .filter(r -> !runAnalysisRepository.existsByPipelineRunId(r.getId()))
                .toList();

        if (failedRuns.isEmpty()) {
            return;
        }

        log.info("Sending {} failed runs to AI analysis", failedRuns.size());

        for (PipelineRun run : failedRuns) {
            try {
                RunAnalysis analysis = aiAnalysisClient.analyse(run);
                if (analysis != null) {
                    runAnalysisRepository.save(analysis);
                    log.info("Analysis saved for run {} — category: {}",
                            run.getId(), analysis.getCategory());
                }
            } catch (Exception e) {
                // Never let analysis failure break the sync
                log.error("Analysis failed for run {}: {}", run.getId(), e.getMessage());
            }
        }
    }

    private void updateLastSyncedAt(MonitoredRepository repository) {
        repository.setLastSyncedAt(Instant.now());
        repositoryRepository.save(repository);
    }
}