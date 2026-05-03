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

    // Existing pageable method (keep it, but don't use for now)
    Page<PipelineRun> findByRepositoryIdOrderByStartedAtDesc(Long repositoryId, Pageable pageable);

    // ✅ ADD THIS (simple list method)
    List<PipelineRun> findByRepositoryId(Long repositoryId);

    List<PipelineRun> findByRepositoryIdAndStartedAtAfterOrderByStartedAtAsc(
            Long repositoryId, Instant since);

    Optional<PipelineRun> findByRepositoryIdAndExternalRunId(
            Long repositoryId, String externalRunId);

    @Query("""
            SELECT COUNT(r) FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.status = :status
              AND r.startedAt >= :since
            """)
    long countByRepositoryIdAndStatusSince(
            @Param("repoId") Long repoId,
            @Param("status") BuildStatus status,
            @Param("since") Instant since);

    @Query("""
            SELECT COUNT(r) FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.startedAt >= :since
              AND r.status != 'IN_PROGRESS'
            """)
    long countCompletedByRepositoryIdSince(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    @Query("""
            SELECT DISTINCT r FROM PipelineRun r
            WHERE r.repository.id = :repoId
              AND r.status = 'FAILURE'
              AND r.headSha IS NOT NULL
              AND EXISTS (
                  SELECT 1 FROM PipelineRun r2
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
}