package com.ayush.cicd.ingestion.scheduler;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Automatically syncs all active repositories on a fixed schedule.
 *
 * WHY @Component not @Service?
 * This class has no business logic — it's a scheduled trigger.
 * It delegates all real work to GitHubIngestionService.
 * @Component is semantically correct for infrastructure classes.
 *
 * WHY fixedDelay and not fixedRate?
 * fixedRate fires every N ms regardless of how long the previous
 * run took. If syncing 50 repos takes 12 minutes and fixedRate
 * is 10 minutes, runs overlap — concurrent syncs on the same repo.
 * fixedDelay waits N ms AFTER the previous execution completes.
 * No overlapping runs. Safer for a small deployment.
 *
 * WHY not use @Scheduled(cron = "...")?
 * Cron is better when you need "run at 2am every night".
 * fixedDelay is better when you need "run every N minutes continuously".
 * Our use case is continuous polling — fixedDelay is correct.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class SyncScheduler {

    private final MonitoredRepositoryRepository repositoryRepository;
    private final GitHubIngestionService gitHubIngestionService;

    /**
     * Syncs all active repositories every 10 minutes.
     * The delay value is read from application.properties so it can
     * be changed per environment without recompiling.
     *
     * WHY initialDelay?
     * Without it, the scheduler fires immediately on startup — before
     * the application is fully initialised and before the first user
     * request has even arrived. 60 seconds gives the app time to
     * warm up connection pools and caches before the first sync hits.
     */
    @Scheduled(
        fixedDelayString = "${sync.interval.ms:600000}",
        initialDelayString = "${sync.initial.delay.ms:60000}"
    )
    public void syncAllRepositories() {
        List<MonitoredRepository> activeRepos = repositoryRepository.findByActiveTrue();

        if (activeRepos.isEmpty()) {
            log.debug("Scheduler: no active repositories to sync");
            return;
        }

        log.info("Scheduler: starting sync for {} active repositories", activeRepos.size());

        int totalNewRuns = 0;
        int successCount = 0;
        int failCount = 0;

        for (MonitoredRepository repo : activeRepos) {
            try {
                int newRuns = gitHubIngestionService.syncRepository(repo.getId());
                totalNewRuns += newRuns;
                successCount++;
                log.info("Scheduler: synced {}/{} — {} new runs",
                        repo.getOwner(), repo.getRepoName(), newRuns);

            } catch (Exception e) {
                // WHY catch and continue instead of letting it propagate?
                // If one repo fails (bad token, repo deleted, rate limit),
                // the other repos should still sync. A single failure must
                // never abort the entire batch.
                failCount++;
                log.error("Scheduler: failed to sync {}/{} — {}",
                        repo.getOwner(), repo.getRepoName(), e.getMessage());
            }
        }

        log.info("Scheduler: completed — {} repos synced, {} failed, {} total new runs",
                successCount, failCount, totalNewRuns);
    }
}