package com.ayush.cicd.api.service;

import com.ayush.cicd.api.dto.request.AddRepositoryRequest;
import com.ayush.cicd.api.dto.response.RepositoryResponse;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.exception.DuplicateResourceException;
import com.ayush.cicd.common.exception.ResourceNotFoundException;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * WHY @Transactional at class level?
 * Every public method gets a transaction by default.
 * Read-only methods override this with @Transactional(readOnly=true)
 * which tells the DB to skip write-lock overhead and tells Hibernate
 * to skip dirty-checking on loaded entities — a free performance win.
 *
 * WHY @RequiredArgsConstructor instead of @Autowired on fields?
 * Constructor injection is testable without Spring context.
 * In a unit test you write: new RepositoryService(mockRepo)
 * With @Autowired field injection you must spin up Spring to inject.
 * Constructor injection is the correct production pattern.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class RepositoryService {

    private final MonitoredRepositoryRepository repositoryRepository;

    @Transactional(readOnly = true)
    public List<RepositoryResponse> findAllActive() {
        log.debug("Fetching all active monitored repositories");
        return repositoryRepository.findByActiveTrue()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RepositoryResponse findById(Long id) {
        MonitoredRepository repo = repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredRepository", id));
        return toResponse(repo);
    }

    public RepositoryResponse addRepository(AddRepositoryRequest request) {
        log.info("Adding repository: {}/{} from {}",
                request.getOwner(), request.getRepoName(), request.getSource());

        if (repositoryRepository.existsByOwnerAndRepoNameAndSource(
                request.getOwner(), request.getRepoName(), request.getSource())) {
            throw new DuplicateResourceException(
                    String.format("Repository %s/%s from %s is already being monitored",
                            request.getOwner(), request.getRepoName(), request.getSource())
            );
        }

        MonitoredRepository repo = MonitoredRepository.builder()
                .owner(request.getOwner())
                .repoName(request.getRepoName())
                .source(request.getSource())
                .defaultBranch(request.getDefaultBranch())
                .active(true)
                .build();

        MonitoredRepository saved = repositoryRepository.save(repo);
        log.info("Repository saved with id: {}", saved.getId());
        return toResponse(saved);
    }

    public void deactivateRepository(Long id) {
        MonitoredRepository repo = repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MonitoredRepository", id));
        repo.setActive(false);
        repositoryRepository.save(repo);
        log.info("Repository {} soft-deleted (active=false)", id);
    }

    /**
     * WHY a private mapper method and not MapStruct here?
     * For a simple DTO with a handful of fields, an inline private method
     * is perfectly readable and has zero compile-time complexity.
     * We introduce MapStruct in ingestion-service where the mapping is
     * genuinely complex — GitHub API response has 40+ fields that need
     * transformation, null-handling, and enum conversion.
     * Don't reach for a tool before it earns its place.
     */
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