package com.ayush.cicd.analytics.repository;

import com.ayush.cicd.common.entity.FailureRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AnalyticsFailureRecordRepository extends JpaRepository<FailureRecord, Long> {

    // ─────────────────────────────────────────────────────────────────────────
    // Stage Failures
    // ─────────────────────────────────────────────────────────────────────────

    @Query("""
                SELECT f.stage, COUNT(f)
                FROM FailureRecord f
                WHERE f.repositoryId = :repoId
                  AND f.occurredAt >= :since
                GROUP BY f.stage
                ORDER BY COUNT(f) DESC
            """)
    List<Object[]> countByStage(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    // ─────────────────────────────────────────────────────────────────────────
    // Category Analytics
    // ─────────────────────────────────────────────────────────────────────────

    @Query("""
                SELECT f.category, COUNT(f)
                FROM FailureRecord f
                WHERE f.repositoryId = :repoId
                  AND f.occurredAt >= :since
                GROUP BY f.category
                ORDER BY COUNT(f) DESC
            """)
    List<Object[]> countByCategory(
            @Param("repoId") Long repoId,
            @Param("since") Instant since);

    // ─────────────────────────────────────────────────────────────────────────
    // Recent Failures
    // ─────────────────────────────────────────────────────────────────────────

    List<FailureRecord> findByRepositoryIdAndOccurredAtAfter(
            Long repositoryId,
            Instant since);

    // ─────────────────────────────────────────────────────────────────────────
    // Most Severe Failures
    // ─────────────────────────────────────────────────────────────────────────

    List<FailureRecord> findByRepositoryIdOrderBySeverityDescOccurredAtDesc(
            Long repositoryId,
            Pageable pageable);

    // ─────────────────────────────────────────────────────────────────────────
    // Flaky Pipelines
    // ─────────────────────────────────────────────────────────────────────────

    @Query("""
                SELECT f
                FROM FailureRecord f
                WHERE f.repositoryId = :repoId
                  AND f.flakinessScore >= :threshold
                ORDER BY f.flakinessScore DESC
            """)
    List<FailureRecord> findFlakyFailures(
            @Param("repoId") Long repoId,
            @Param("threshold") Double threshold);

    // ─────────────────────────────────────────────────────────────────────────
    // OOM / Timeout Analytics
    // ─────────────────────────────────────────────────────────────────────────

    long countByRepositoryIdAndIsOomTrue(Long repositoryId);

    long countByRepositoryIdAndIsTimeoutTrue(Long repositoryId);

    // ─────────────────────────────────────────────────────────────────────────
    // Top Failure Signatures
    // ─────────────────────────────────────────────────────────────────────────

    @Query("""
                SELECT f.signature, COUNT(f)
                FROM FailureRecord f
                WHERE f.repositoryId = :repoId
                  AND f.signature IS NOT NULL
                GROUP BY f.signature
                ORDER BY COUNT(f) DESC
            """)
    List<Object[]> topFailureSignatures(
            @Param("repoId") Long repoId,
            Pageable pageable);
}