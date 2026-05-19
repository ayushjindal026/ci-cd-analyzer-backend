package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineRunRepository extends JpaRepository<PipelineRun, Long> {

    // =====================================================
    // Basic Queries
    // =====================================================

    Page<PipelineRun> findByRepository_IdOrderByStartedAtDesc(
            Long repositoryId,
            Pageable pageable);

    List<PipelineRun> findByRepository_Id(
            Long repositoryId);

    List<PipelineRun> findByRepository_IdAndStartedAtAfterOrderByStartedAtAsc(
            Long repositoryId,
            Instant since);

    Optional<PipelineRun> findByRepository_IdAndExternalRunId(
            Long repositoryId,
            String externalRunId);

    List<PipelineRun> findByRepository_IdAndStatusAndStartedAtAfter(
            Long repositoryId,
            BuildStatus status,
            Instant startedAt);

    // =====================================================
    // Metrics Queries
    // =====================================================

    @Query("""
            SELECT COUNT(r)
            FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.status = :status
              AND r.startedAt >= :since
            """)
    long countByRepositoryIdAndStatusSince(
            @Param("repoId") Long repoId,
            @Param("status") BuildStatus status,
            @Param("since") Instant since);

    @Query("""
            SELECT COUNT(r)
            FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.startedAt >= :since
              AND r.status != 'QUEUED'
            """)
    long countCompletedByRepositoryIdSince(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    @Query("""
            SELECT AVG(p.durationMs)
            FROM PipelineRun p
            WHERE p.repository.id = :repoId
              AND p.startedAt > :since
            """)
    Double avgDurationSince(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    // =====================================================
    // Flaky Run Detection
    // =====================================================

    @Query("""
            SELECT DISTINCT r
            FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.status = 'FAILED'
              AND r.headSha IS NOT NULL
              AND EXISTS (
                  SELECT 1
                  FROM PipelineRun r2
                  WHERE r2.repository.id = r.repository.id
                    AND r2.headSha = r.headSha
                    AND r2.workflowName = r.workflowName
                    AND r2.status = 'SUCCESS'
                    AND r2.startedAt > r.startedAt
              )
              AND r.startedAt >= :since
            """)
    List<PipelineRun> findFlakyRuns(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    // =====================================================
    // Fetch Repository With Run
    // =====================================================

    @Query("""
            SELECT pr
            FROM PipelineRun pr
            JOIN FETCH pr.repository
            WHERE pr.id = :id
            """)
    Optional<PipelineRun> findByIdWithRepository(
            @Param("id") Long id);
}