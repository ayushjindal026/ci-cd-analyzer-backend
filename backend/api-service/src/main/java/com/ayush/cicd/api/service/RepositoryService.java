// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/service/RepositoryService.java
package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.exception.DuplicateResourceException;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.ingestion.service.GitHubIngestionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class RepositoryService {

        private final MonitoredRepositoryRepository repositoryRepository;
        private final GitHubIngestionService ingestionService;
        private final NotificationService notificationService;

        // ── List ──────────────────────────────────────────────────────────────────

        @Transactional(readOnly = true)
        public List<RepositoryResponse> findAllActiveForUser(User currentUser) {
                return repositoryRepository
                                .findByActiveTrueAndUser(currentUser)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        // ── Get single ────────────────────────────────────────────────────────────

        @Transactional(readOnly = true)
        public RepositoryResponse findByIdForUser(Long id, User currentUser) {
                MonitoredRepository repo = repositoryRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("MonitoredRepository", id));
                assertOwnership(repo, currentUser);
                return toResponse(repo);
        }

        // ── Add ───────────────────────────────────────────────────────────────────

        public RepositoryResponse addRepository(AddRepositoryRequest request, User currentUser) {
                log.info("User {} adding repository: {}/{}",
                                currentUser.getUsername(), request.getOwner(), request.getRepoName());

                if (repositoryRepository.existsByOwnerAndRepoNameAndSourceAndUser(
                                request.getOwner(), request.getRepoName(),
                                request.getSource(), currentUser)) {
                        throw new DuplicateResourceException(
                                        String.format("You are already monitoring %s/%s from %s",
                                                        request.getOwner(), request.getRepoName(),
                                                        request.getSource()));
                }

                MonitoredRepository repo = MonitoredRepository.builder()
                                .owner(request.getOwner())
                                .repoName(request.getRepoName())
                                .source(request.getSource())
                                .defaultBranch(request.getDefaultBranch())
                                .active(true)
                                .user(currentUser)
                                .build();

                MonitoredRepository saved = repositoryRepository.save(repo);
                log.info("Repository saved with id: {}", saved.getId());

                // ── Trigger initial sync async so the HTTP response returns immediately ──
                // This fetches the last 25 runs from GitHub and persists them.
                // Without this, the repo shows 0 runs until the next scheduled sync (15 min).
                triggerInitialSync(saved);

                return toResponse(saved);
        }

        /**
         * Async initial sync — fires after save, doesn't block the HTTP response.
         * Marked @Async so it runs in the logFetchExecutor thread pool.
         */
        @Async("logFetchExecutor")
        public void triggerInitialSync(MonitoredRepository repo) {

                try {

                        log.info("Starting initial sync for {}/{}",
                                        repo.getOwner(),
                                        repo.getRepoName());

                        ingestionService.syncRepository(repo.getId());

                        log.info("Initial sync complete for {}/{}",
                                        repo.getOwner(),
                                        repo.getRepoName());

                } catch (Exception e) {

                        log.error("Initial sync failed for {}/{}: {}",
                                        repo.getOwner(),
                                        repo.getRepoName(),
                                        e.getMessage());
                }
        }

        // ── Manual sync (called by PipelineRunController) ─────────────────────────

        public int syncRepository(Long repoId, User currentUser) {

                MonitoredRepository repo = repositoryRepository.findById(repoId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "MonitoredRepository", repoId));

                assertOwnership(repo, currentUser);

                log.info("Manual sync triggered for {}/{}",
                                repo.getOwner(),
                                repo.getRepoName());

                return ingestionService.syncRepository(repo.getId());
        }

        // ── Deactivate ────────────────────────────────────────────────────────────

        public void deactivateRepository(Long id, User currentUser) {
                MonitoredRepository repo = repositoryRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("MonitoredRepository", id));
                assertOwnership(repo, currentUser);
                repo.setActive(false);
                repositoryRepository.save(repo);
                log.info("Repository {} deactivated by user {}", id, currentUser.getUsername());
        }

        // ── Private ───────────────────────────────────────────────────────────────

        /**
         * WHY assertOwnership instead of querying by id AND userId?
         * Returns 404 (not 403) so we don't leak whether the ID exists.
         */
        private void assertOwnership(MonitoredRepository repo, User currentUser) {
                if (repo.getUser() == null ||
                                !repo.getUser().getId().equals(currentUser.getId())) {
                        throw new ResourceNotFoundException("MonitoredRepository", repo.getId());
                }
        }

        private RepositoryResponse toResponse(MonitoredRepository repo) {
                return RepositoryResponse.builder()
                                .id(repo.getId())
                                .owner(repo.getOwner())
                                .repoName(repo.getRepoName())
                                .source(repo.getSource())
                                .defaultBranch(repo.getDefaultBranch())
                                .lastSyncedAt(repo.getLastSyncedAt())
                                .createdAt(repo.getCreatedAt())
                                .active(repo.isActive())
                                .totalRuns(repo.getTotalRuns())
                                .lastRunStatus(repo.getLastRunStatus())
                                .lastRunAt(repo.getLastRunAt())
                                .build();
        }
}