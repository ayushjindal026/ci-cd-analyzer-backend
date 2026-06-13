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

    // ── Overload: called by PipelineRunController with just repoId ────────────

    /**
     * Called by PipelineRunController.syncRepository(repoId).
     * Looks up the MonitoredRepository then delegates to the full sync.
     * Returns count of new runs ingested.
     */
    public int syncRepository(Long repoId) {
        MonitoredRepository repo = repoRepository.findById(repoId)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found: " + repoId));
        return syncRepository(repo);
    }

    // ── Main sync: called by RepositoryService + SyncScheduler ───────────────

    /**
     * Fetches the latest N workflow runs from GitHub and upserts them.
     * Returns count of newly-created runs.
     */
    private int syncRepository(MonitoredRepository repo) {
        log.debug("Syncing {}/{}", repo.getOwner(), repo.getRepoName());

        // Use the repo owner's GitHub token — not the global token
        String token = resolveToken(repo);

        List<GitHubWorkflowRunDto> ghRuns = githubClient.fetchRecentRuns(
                repo.getOwner(),
                repo.getRepoName(),
                token,
                RUNS_PER_SYNC);

        if (ghRuns == null || ghRuns.isEmpty()) {
            log.debug("No runs returned for {}/{}", repo.getOwner(), repo.getRepoName());
            updateLastSynced(repo);
            return 0;
        }

        int created = 0, updated = 0;

        for (GitHubWorkflowRunDto dto : ghRuns) {
            boolean isNew = !runRepository.existsByExternalRunId(dto.getExternalId());
            PipelineRun run = upsertRun(repo, dto);

            if (isNew) {
                created++;
                // Trigger AI analysis for newly-discovered FAILED runs
                if (run.getStatus() == BuildStatus.FAILED
                        && run.getAnalysisStatus() == AnalysisStatus.PENDING) {
                    log.info("Queueing AI analysis for failed run {} on {}/{}",
                            run.getExternalRunId(), repo.getOwner(), repo.getRepoName());
                    run.setAnalysisStatus(AnalysisStatus.IN_PROGRESS);
                    runRepository.save(run);
                    logFetcher.fetchAndAnalyse(repo.getId(), run.getId());
                }
            } else {
                updated++;
            }
        }

        // Update repo summary fields from the latest run
        ghRuns.stream().findFirst().ifPresent(latest -> {
            BuildStatus latest_status = BuildStatus.from(
                    latest.getConclusion(), latest.getStatus());
            repo.setLastRunStatus(latest_status.name().toLowerCase());
            repo.setLastRunAt(Instant.now());
            repo.setTotalRuns((int) runRepository.countByRepository_Id(repo.getId()));
        });

        updateLastSynced(repo);

        log.info("Sync complete for {}/{}: {} created, {} updated",
                repo.getOwner(), repo.getRepoName(), created, updated);

        return created;
    }

    // ── Active run polling (called by SyncScheduler every 60s) ───────────────

    public void syncActiveRuns(MonitoredRepository repo) {
        List<PipelineRun> activeRuns = runRepository.findByRepository_IdAndStatusIn(
                repo.getId(), List.of(BuildStatus.RUNNING, BuildStatus.PENDING));

        if (activeRuns.isEmpty())
            return;

        String token = resolveToken(repo);

        for (PipelineRun run : activeRuns) {
            try {
                GitHubWorkflowRunDto dto = githubClient.fetchSingleRun(
                        repo.getOwner(), repo.getRepoName(),
                        run.getExternalRunId(), token);

                if (dto == null)
                    continue;

                BuildStatus newStatus = BuildStatus.from(dto.getConclusion(), dto.getStatus());
                if (newStatus == run.getStatus())
                    continue;

                run.setStatus(newStatus);
                if (dto.getCompletedAt() != null && newStatus.isTerminal()) {
                    run.setCompletedAt(dto.getCompletedAt());
                    if (run.getStartedAt() != null) {
                        run.setDurationMs(
                                run.getCompletedAt().toEpochMilli()
                                        - run.getStartedAt().toEpochMilli());
                    }
                }
                runRepository.save(run);

                // Trigger analysis if just became FAILED
                if (newStatus == BuildStatus.FAILED
                        && run.getAnalysisStatus() == AnalysisStatus.PENDING) {
                    run.setAnalysisStatus(AnalysisStatus.IN_PROGRESS);
                    runRepository.save(run);
                    logFetcher.fetchAndAnalyse(repo.getId(), run.getId());
                }

            } catch (Exception e) {
                log.debug("Active run poll failed for run {}: {}",
                        run.getExternalRunId(), e.getMessage());
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PipelineRun upsertRun(MonitoredRepository repo, GitHubWorkflowRunDto dto) {
        return runRepository.findByExternalRunId(dto.getExternalId())
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

    /**
     * Resolves the GitHub token to use for API calls.
     * Prefers the repo owner's personal token (stored from OAuth).
     * Falls back to server-level token (PAT in application.properties).
     */
    private String resolveToken(MonitoredRepository repo) {
        if (repo.getUser() != null
                && repo.getUser().getGithubToken() != null
                && !repo.getUser().getGithubToken().isBlank()) {
            return repo.getUser().getGithubToken();
        }
        // Fallback: server PAT (used for public repos)
        log.warn("No user token for {}/{} — falling back to server token",
                repo.getOwner(), repo.getRepoName());
        return "";
    }
}