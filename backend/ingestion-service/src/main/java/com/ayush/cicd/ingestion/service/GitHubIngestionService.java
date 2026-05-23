// PATH: backend/ingestion-service/src/main/java/com/ayush/cicd/ingestion/service/GitHubIngestionService.java
package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.AnalysisStatus;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.ayush.cicd.ingestion.client.GitHubActionsClient;
import com.ayush.cicd.ingestion.client.dto.GitHubWorkflowRunDto;
import com.ayush.cicd.ingestion.mapper.GitHubRunMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Pulls the latest workflow runs from GitHub API and persists them.
 * Called both by SyncScheduler (periodic) and RepositoryService (manual sync).
 *
 * Flow:
 * 1. Fetch last N runs from GitHub Actions API
 * 2. For each run: upsert PipelineRun (create or update status)
 * 3. For new FAILED runs: trigger async AI analysis
 * 4. Update MonitoredRepository.lastSyncedAt
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GitHubIngestionService {

    private final GitHubActionsClient githubClient;
    private final PipelineRunRepository runRepository;
    private final MonitoredRepositoryRepository repoRepository;
    private final GitHubRunMapper runMapper;
    private final GitHubLogFetcherService logFetcher;

    private static final int RUNS_PER_SYNC = 25;

    // ── Full repo sync ────────────────────────────────────────────────────────

    public int syncRepository(Long repositoryId) {
        MonitoredRepository repo = repoRepository.findById(repositoryId)
                .orElseThrow(() -> new IllegalArgumentException("Repo not found: " + repositoryId));

        log.debug("Syncing {}/{}", repo.getOwner(), repo.getRepoName());

        List<GitHubWorkflowRunDto> ghRuns = githubClient.fetchRecentRuns(
                repo.getOwner(),
                repo.getRepoName(),
                repo.getUser().getGithubToken(),
                RUNS_PER_SYNC);

        if (ghRuns == null || ghRuns.isEmpty()) {
            log.debug("No runs returned for {}/{}", repo.getOwner(), repo.getRepoName());
            updateLastSynced(repo);
            return 0;
        }

        int created = 0, updated = 0;

        for (GitHubWorkflowRunDto dto : ghRuns) {
            boolean isNew = runRepository.findByRepository_IdAndExternalRunId(
                    repo.getId(),
                    dto.getExternalId())
                    .isEmpty();

            PipelineRun run = upsertRun(repo, dto);

            if (isNew)
                created++;
            else
                updated++;

            // Trigger AI analysis for newly-discovered failed runs
            if (isNew && run.getStatus() == BuildStatus.FAILED) {
                log.info("New failed run discovered: {} — queuing analysis", run.getExternalRunId());
                run.setAnalysisStatus(AnalysisStatus.IN_PROGRESS);
                runRepository.save(run);
                logFetcher.fetchAndAnalyse(repo.getId(), run.getId());
            }
        }

        // Update repo summary fields
        ghRuns.stream().findFirst().ifPresent(latest -> {
            repo.setLastRunStatus(
                    BuildStatus.from(latest.getConclusion(), latest.getStatus()).name().toLowerCase());
            repo.setLastRunAt(Instant.now());
            repo.setTotalRuns(
                    (int) runRepository.countByRepository_Id(repo.getId()));
        });

        updateLastSynced(repo);
        log.info("Sync {}/{}: {} created, {} updated", repo.getOwner(), repo.getRepoName(), created, updated);
        return created;
    }

    // ── Active run polling ────────────────────────────────────────────────────

    public void syncActiveRuns(MonitoredRepository repo) {
        List<PipelineRun> activeRuns = runRepository
                .findByRepository_IdAndStatusIn(
                        repo.getId(),
                        List.of(BuildStatus.RUNNING, BuildStatus.PENDING));

        if (activeRuns.isEmpty())
            return;

        for (PipelineRun run : activeRuns) {
            try {
                GitHubWorkflowRunDto dto = githubClient.fetchSingleRun(
                        repo.getOwner(),
                        repo.getRepoName(),
                        run.getExternalRunId(),
                        repo.getUser().getGithubToken());
                if (dto == null)
                    continue;

                BuildStatus newStatus = BuildStatus.from(dto.getConclusion(), dto.getStatus());
                if (newStatus == run.getStatus())
                    continue; // no change

                run.setStatus(newStatus);
                if (dto.getCompletedAt() != null) {
                    run.setCompletedAt(dto.getCompletedAt());
                    if (run.getStartedAt() != null) {
                        run.setDurationMs(
                                run.getCompletedAt().toEpochMilli() - run.getStartedAt().toEpochMilli());
                    }
                }
                runRepository.save(run);

                // Trigger analysis if just transitioned to FAILED
                if (newStatus == BuildStatus.FAILED
                        && run.getAnalysisStatus() == AnalysisStatus.PENDING) {
                    run.setAnalysisStatus(AnalysisStatus.IN_PROGRESS);
                    runRepository.save(run);
                    logFetcher.fetchAndAnalyse(repo.getId(), run.getId());
                }

            } catch (Exception e) {
                log.debug(
                        "Failed to poll run {}: {}",
                        run.getExternalRunId(),
                        e);
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PipelineRun upsertRun(MonitoredRepository repo, GitHubWorkflowRunDto dto) {

        return runRepository.findByRepository_IdAndExternalRunId(
                repo.getId(),
                dto.getExternalId())
                .map(existing -> {
                    runMapper.updateFromDto(existing, dto);
                    return runRepository.save(existing);
                })
                .orElseGet(() -> {
                    PipelineRun newRun = runMapper.toEntity(dto, repo);
                    return runRepository.save(newRun);
                });
    }

    private void updateLastSynced(MonitoredRepository repo) {
        repo.setLastSyncedAt(Instant.now());
        repoRepository.save(repo);
    }
}