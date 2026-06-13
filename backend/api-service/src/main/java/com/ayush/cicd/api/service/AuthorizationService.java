// PATH: backend/api-service/src/main/java/com/ayush/cicd/api/service/AuthorizationService.java

package com.ayush.cicd.api.service;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Centralized authorization service.
 *
 * RESPONSIBILITIES:
 * - Repository ownership validation
 * - Pipeline run ownership validation
 * - Anti-resource-enumeration protection
 * - Centralized access control
 *
 * SECURITY MODEL:
 * Always return 404 instead of 403 for unauthorized resources.
 *
 * WHY?
 * Prevent attackers from confirming whether a resource exists.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorizationService {

        private final MonitoredRepositoryRepository repositoryRepository;

        private final PipelineRunRepository pipelineRunRepository;

        // ------------------------------------------------------------------------
        // Repository Authorization
        // ------------------------------------------------------------------------

        /**
         * Requires repository ownership access.
         *
         * Returns repository if:
         * - exists
         * - owned by current user
         *
         * Otherwise throws ResourceNotFoundException.
         */
        public MonitoredRepository requireRepoAccess(
                        Long repoId,
                        User currentUser) {

                validateAuthenticatedUser(currentUser);

                MonitoredRepository repository = repositoryRepository.findById(repoId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "MonitoredRepository",
                                                repoId));

                if (!isOwner(repository, currentUser)) {

                        logUnauthorizedRepoAccess(
                                        currentUser,
                                        repoId,
                                        repository);

                        throw new ResourceNotFoundException(
                                        "MonitoredRepository",
                                        repoId);
                }

                return repository;
        }

        /**
         * Requires repository ownership + active repository.
         */
        public MonitoredRepository requireActiveRepoAccess(
                        Long repoId,
                        User currentUser) {

                MonitoredRepository repository = requireRepoAccess(repoId, currentUser);

                if (!repository.isActive()) {

                        throw new ResourceNotFoundException(
                                        "MonitoredRepository",
                                        repoId);
                }

                return repository;
        }

        // ------------------------------------------------------------------------
        // Pipeline Run Authorization
        // ------------------------------------------------------------------------

        /**
         * Requires pipeline run ownership access.
         */
        public PipelineRun requireRunAccess(
                        Long runId,
                        User currentUser) {

                validateAuthenticatedUser(currentUser);

                PipelineRun pipelineRun = pipelineRunRepository.findById(runId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "PipelineRun",
                                                runId));

                if (pipelineRun.getRepository() == null
                                || !isOwner(
                                                pipelineRun.getRepository(),
                                                currentUser)) {

                        logUnauthorizedRunAccess(
                                        currentUser,
                                        runId,
                                        pipelineRun);

                        throw new ResourceNotFoundException(
                                        "PipelineRun",
                                        runId);
                }

                return pipelineRun;
        }

        /**
         * Requires:
         * - repo ownership
         * - run belongs to repo
         */
        public PipelineRun requireRunAccess(
                        Long repoId,
                        Long runId,
                        User currentUser) {

                MonitoredRepository repository = requireRepoAccess(repoId, currentUser);

                PipelineRun pipelineRun = pipelineRunRepository.findById(runId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "PipelineRun",
                                                runId));

                if (pipelineRun.getRepository() == null
                                || !pipelineRun.getRepository()
                                                .getId()
                                                .equals(repository.getId())) {

                        throw new ResourceNotFoundException(
                                        "PipelineRun",
                                        runId);
                }

                return pipelineRun;
        }

        // ------------------------------------------------------------------------
        // Boolean Access Checks
        // ------------------------------------------------------------------------

        public boolean canAccessRepo(
                        Long repoId,
                        User currentUser) {

                if (currentUser == null) {
                        return false;
                }

                return repositoryRepository.findById(repoId)
                                .map(repository -> isOwner(repository, currentUser))
                                .orElse(false);
        }

        public boolean canAccessRun(
                        Long runId,
                        User currentUser) {

                if (currentUser == null) {
                        return false;
                }

                return pipelineRunRepository.findById(runId)
                                .map(run -> run.getRepository() != null
                                                && isOwner(
                                                                run.getRepository(),
                                                                currentUser))
                                .orElse(false);
        }

        // ------------------------------------------------------------------------
        // Private Helpers
        // ------------------------------------------------------------------------

        private boolean isOwner(
                        MonitoredRepository repository,
                        User currentUser) {

                return repository.getUser() != null
                                && repository.getUser().getId() != null
                                && repository.getUser()
                                                .getId()
                                                .equals(currentUser.getId());
        }

        private void validateAuthenticatedUser(User currentUser) {

                if (currentUser == null
                                || currentUser.getId() == null) {

                        throw new IllegalStateException(
                                        "Authenticated user required");
                }
        }

        private void logUnauthorizedRepoAccess(
                        User currentUser,
                        Long repoId,
                        MonitoredRepository repository) {

                log.warn(
                                "Unauthorized repository access attempt: " +
                                                "userId={} repoId={} ownerId={}",
                                currentUser.getId(),
                                repoId,
                                repository.getUser() != null
                                                ? repository.getUser().getId()
                                                : "unknown");
        }

        private void logUnauthorizedRunAccess(
                        User currentUser,
                        Long runId,
                        PipelineRun pipelineRun) {

                log.warn(
                                "Unauthorized pipeline run access attempt: " +
                                                "userId={} runId={} ownerId={}",
                                currentUser.getId(),
                                runId,
                                pipelineRun.getRepository() != null
                                                && pipelineRun.getRepository().getUser() != null
                                                                ? pipelineRun.getRepository()
                                                                                .getUser()
                                                                                .getId()
                                                                : "unknown");
        }
}