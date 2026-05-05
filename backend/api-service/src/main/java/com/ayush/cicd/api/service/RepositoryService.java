package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.exception.DuplicateResourceException;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

        @Transactional(readOnly = true)
        public List<RepositoryResponse> findAllActiveForUser(User currentUser) {
                return repositoryRepository
                                .findByActiveTrueAndUser(currentUser)
                                .stream()
                                .map(this::toResponse)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public RepositoryResponse findByIdForUser(Long id, User currentUser) {
                MonitoredRepository repo = repositoryRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "MonitoredRepository", id));
                assertOwnership(repo, currentUser);
                return toResponse(repo);
        }

        public RepositoryResponse addRepository(
                        AddRepositoryRequest request, User currentUser) {

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
                return toResponse(saved);
        }

        public void deactivateRepository(Long id, User currentUser) {
                MonitoredRepository repo = repositoryRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "MonitoredRepository", id));
                assertOwnership(repo, currentUser);
                repo.setActive(false);
                repositoryRepository.save(repo);
                log.info("Repository {} deactivated by user {}",
                                id, currentUser.getUsername());
        }

        /**
         * WHY assertOwnership instead of querying by id AND userId?
         * Querying by both gives a misleading 404 when the resource
         * exists but belongs to another user. That leaks information —
         * the attacker knows the ID is valid.
         * Loading by ID then checking ownership gives a proper 403,
         * which is semantically correct and doesn't leak existence.
         */
        private void assertOwnership(MonitoredRepository repo, User currentUser) {
                if (repo.getUser() == null ||
                                !repo.getUser().getId().equals(currentUser.getId())) {
                        throw new ResourceNotFoundException(
                                        "MonitoredRepository", repo.getId());
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
                                .build();
        }
}