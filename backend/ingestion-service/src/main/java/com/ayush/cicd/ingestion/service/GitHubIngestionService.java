package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.ingestion.client.GitHubActionsClient;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunsResponse;
import com.ayush.cicd.ingestion.mapper.GitHubRunMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;

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
                .orElseThrow(() ->
                        new RuntimeException("Repository not found with id: " + repositoryId));

        log.info("Starting sync for {}/{} (id={})",
                repository.getOwner(), repository.getRepoName(), repositoryId);

        // safer handling for first run
        Instant since = repository.getLastSyncedAt() != null
                ? repository.getLastSyncedAt()
                : Instant.EPOCH;

        GitHubWorkflowRunsResponse response = gitHubActionsClient.fetchWorkflowRuns(
                repository.getOwner(),
                repository.getRepoName(),
                since
        );

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
                continue;
            }

            PipelineRun run = mapper.toPipelineRun(dto, repository);
            newRuns.add(run);
        }

        if (!newRuns.isEmpty()) {
            pipelineRunRepository.saveAll(newRuns);

            log.info("Saved {} new runs for {}/{}",
                    newRuns.size(), repository.getOwner(), repository.getRepoName());
        }

        updateLastSyncedAt(repository);

        return newRuns.size();
    }

    // ✅ THIS WAS MISSING (CRITICAL FIX)
    @Transactional(readOnly = true)
    public List<PipelineRun> getRunsForRepository(Long repositoryId) {
        return pipelineRunRepository.findByRepositoryId(repositoryId);
    }

    private void updateLastSyncedAt(MonitoredRepository repository) {
        repository.setLastSyncedAt(Instant.now());
        repositoryRepository.save(repository);
    }
}