// PATH: backend/ingestion-service/src/main/java/com/ayush/cicd/ingestion/scheduler/SyncScheduler.java
package com.ayush.cicd.ingestion.scheduler;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;
import com.ayush.cicd.ingestion.service.LogStorageService;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Scheduled background jobs for keeping pipeline data fresh.
 *
 * Jobs:
 *   syncAllRepositories   — every 15 min, fetch latest runs from GitHub
 *   syncActiveRuns        — every 60s,   update in-progress runs
 *   cleanupOldLogs        — daily 2am,   delete compressed logs older than 90 days
 *   cleanupStaleRuns      — daily 3am,   mark abandoned RUNNING runs as CANCELLED
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SyncScheduler {

    private final GitHubIngestionService        ingestionService;
    private final MonitoredRepositoryRepository repoRepository;
    private final PipelineRunRepository         runRepository;
    private final LogStorageService             logStorageService;

    @Value("${sync.enabled:true}")
    private boolean syncEnabled;

    @Value("${sync.log-retention-days:90}")
    private int logRetentionDays;

    // ── Full sync — every 15 minutes ──────────────────────────────────────────

    /**
     * Fetches the latest workflow runs for ALL active repositories.
     * Runs every 15 minutes — catches missed webhook events.
     *
     * Staggered with initialDelay so it doesn't run on startup
     * (webhooks should handle real-time; this is a safety net).
     */
    @Scheduled(fixedDelayString = "${sync.interval-ms:900000}",
               initialDelayString = "${sync.initial-delay-ms:60000}")
    public void syncAllRepositories() {
        if (!syncEnabled) return;

        List<MonitoredRepository> repos = repoRepository.findByActiveTrue();
        if (repos.isEmpty()) return;

        log.info("Starting scheduled sync for {} repositories", repos.size());
        int synced = 0, errors = 0;

        for (MonitoredRepository repo : repos) {
            try {
                ingestionService.syncRepository(repo.getId());
                synced++;
            } catch (Exception e) {
                errors++;
                log.error("Sync failed for {}/{}: {}",
                        repo.getOwner(), repo.getRepoName(), e.getMessage());
            }
        }

        log.info("Sync complete: {} succeeded, {} failed", synced, errors);
    }

    // ── Active run polling — every 60 seconds ─────────────────────────────────

    /**
     * Polls running pipelines every 60s to update their status.
     * Only active when there are RUNNING runs — saves API quota.
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void syncActiveRuns() {
        if (!syncEnabled) return;

        long runningCount = runRepository.countByStatus(BuildStatus.RUNNING);
        if (runningCount == 0) return;

        log.debug("Polling {} active runs", runningCount);

        List<MonitoredRepository> repos = repoRepository.findByActiveTrue();
        for (MonitoredRepository repo : repos) {
            try {
                ingestionService.syncActiveRuns(repo);
            } catch (Exception e) {
                log.debug("Active run poll failed for {}: {}", repo.getFullName(), e.getMessage());
            }
        }
    }

    // ── Log cleanup — daily at 2am ────────────────────────────────────────────

    /**
     * Deletes compressed logs older than `log-retention-days` (default 90).
     * Keeps DB storage bounded without manual intervention.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldLogs() {
        Instant cutoff = Instant.now().minusSeconds((long) logRetentionDays * 86_400L);
        try {
            int deleted = logStorageService.deleteOlderThan(cutoff);
            log.info("Log cleanup: deleted {} log entries older than {} days",
                    deleted, logRetentionDays);
        } catch (Exception e) {
            log.error("Log cleanup failed: {}", e.getMessage());
        }
    }

    // ── Stale run cleanup — daily at 3am ──────────────────────────────────────

    /**
     * Marks RUNNING runs that haven't updated in 2 hours as CANCELLED.
     * Handles cases where the webhook was missed and the run was killed.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupStaleRuns() {
        Instant staleThreshold = Instant.now().minusSeconds(2 * 3600L);
        try {
            int cancelled = runRepository.cancelStaleRunsBefore(staleThreshold);
            if (cancelled > 0) {
                log.info("Stale run cleanup: marked {} runs as CANCELLED", cancelled);
            }
        } catch (Exception e) {
            log.error("Stale run cleanup failed: {}", e.getMessage());
        }
    }
}