package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.enums.PipelineSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WHY JpaRepository and not CrudRepository?
 * JpaRepository adds pagination (findAll(Pageable)), batch operations,
 * and flush control on top of CrudRepository. For production use we
 * want all of that available without extra setup.
 *
 * WHY is this in common and not api-service?
 * Both ingestion-service (writes runs) and api-service (reads for REST)
 * need access to this repository. If it lived in api-service, ingestion
 * would have to depend on api — that's a circular dependency.
 * common has no upstream dependencies, so everything can depend on it safely.
 */
@Repository
public interface MonitoredRepositoryRepository extends JpaRepository<MonitoredRepository, Long> {

        Optional<MonitoredRepository> findByOwnerAndRepoNameAndSource(
                        String owner, String repoName, PipelineSource source);

        List<MonitoredRepository> findByActiveTrue();

        List<MonitoredRepository> findByActiveTrueAndUser(User user);

        boolean existsByOwnerAndRepoNameAndSourceAndUser(
                        String owner, String repoName, PipelineSource source, User user);
}