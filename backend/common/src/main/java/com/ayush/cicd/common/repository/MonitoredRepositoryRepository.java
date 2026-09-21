package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.User;
import com.ayush.cicd.common.enums.PipelineSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
public interface MonitoredRepositoryRepository
        extends JpaRepository<MonitoredRepository, Long> {

        /**
         * Find repository by owner + repo name + source.
         */
        Optional<MonitoredRepository> findByOwnerAndRepoNameAndSource(
                String owner,
                String repoName,
                PipelineSource source);

        /**
         * Get all active repositories.
         */
        List<MonitoredRepository> findByActiveTrue();

        /**
         * Get all active repositories for a user.
         */
        List<MonitoredRepository> findByActiveTrueAndUser(User user);

        /**
         * Check repository existence for a user.
         */
        boolean existsByOwnerAndRepoNameAndSourceAndUser(
                String owner,
                String repoName,
                PipelineSource source,
                User user);

        /**
         * Get repositories by user ID.
         *
         * IMPORTANT:
         * Use User_Id because entity contains:
         *
         * private User user;
         */
        List<MonitoredRepository> findByUser_Id(Long userId);

        /**
         * Find repository by owner + repo name.
         */
        Optional<MonitoredRepository> findByOwnerAndRepoName(
                String owner,
                String repoName);

        /**
         * Find repository by owner + repo name + user ID.
         */
        Optional<MonitoredRepository> findByOwnerAndRepoNameAndUser_Id(
                String owner,
                String repoName,
                Long userId);

        /**
         * Check repository existence by owner + repo name + user ID.
         */
        boolean existsByOwnerAndRepoNameAndUser_Id(
                String owner,
                String repoName,
                Long userId);

        /**
         * Find a monitored repository together with its owning User.
         *
         * WHY:
         * MonitoredRepository.user is intentionally LAZY. The AI analysis flow
         * needs the user's GitHub token after the repository has been loaded.
         * A normal findById() may leave User as a Hibernate proxy after the
         * persistence context closes, causing LazyInitializationException.
         *
         * JOIN FETCH loads the User in the same query so callers can safely
         * access user.getGithubToken().
         */
        @Query("""
                SELECT r
                FROM MonitoredRepository r
                LEFT JOIN FETCH r.user
                WHERE r.id = :id
                """)
        Optional<MonitoredRepository> findByIdWithUser(
                @Param("id") Long id);
}