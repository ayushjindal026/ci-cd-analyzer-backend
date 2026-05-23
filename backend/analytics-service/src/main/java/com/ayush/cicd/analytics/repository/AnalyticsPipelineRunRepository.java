package com.ayush.cicd.analytics.repository;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnalyticsPipelineRunRepository extends JpaRepository<PipelineRun, Long> {

        // ─────────────────────────────────────────────────────────────────────────
        // Basic Metrics
        // ─────────────────────────────────────────────────────────────────────────

        @Query("""
                            SELECT COUNT(p)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.status = :status
                              AND p.startedAt >= :since
                        """)
        long countByRepoAndStatusSince(
                        @Param("repoId") Long repoId,
                        @Param("status") BuildStatus status,
                        @Param("since") Instant since);

        @Query("""
                            SELECT AVG(p.durationMs)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.startedAt >= :since
                              AND p.durationMs IS NOT NULL
                        """)
        Double avgDurationMsSince(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);

        @Query("""
                            SELECT COUNT(p)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.startedAt >= :since
                        """)
        long countAllRunsSince(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);

        // ─────────────────────────────────────────────────────────────────────────
        // Latest Run
        // ─────────────────────────────────────────────────────────────────────────

        Optional<PipelineRun> findTopByRepository_IdOrderByStartedAtDesc(Long repositoryId);

        // ─────────────────────────────────────────────────────────────────────────
        // Recent Runs
        // ─────────────────────────────────────────────────────────────────────────

        List<PipelineRun> findByRepositoryIdOrderByStartedAtDesc(
                        Long repositoryId,
                        Pageable pageable);

        // ─────────────────────────────────────────────────────────────────────────
        // Trend Analytics
        // ─────────────────────────────────────────────────────────────────────────

        @Query("""
                            SELECT DATE(p.startedAt), COUNT(p)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.startedAt >= :since
                            GROUP BY DATE(p.startedAt)
                            ORDER BY DATE(p.startedAt)
                        """)
        List<Object[]> countRunsGroupedByDay(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);

        @Query("""
                            SELECT DATE(p.startedAt), AVG(p.durationMs)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.startedAt >= :since
                              AND p.durationMs IS NOT NULL
                            GROUP BY DATE(p.startedAt)
                            ORDER BY DATE(p.startedAt)
                        """)
        List<Object[]> averageDurationGroupedByDay(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);

        // ─────────────────────────────────────────────────────────────────────────
        // Failure Analytics
        // ─────────────────────────────────────────────────────────────────────────

        @Query("""
                            SELECT p.branch, COUNT(p)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.status = com.ayush.cicd.common.enums.BuildStatus.FAILED
                              AND p.startedAt >= :since
                            GROUP BY p.branch
                            ORDER BY COUNT(p) DESC
                        """)
        List<Object[]> topFailingBranches(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);

        @Query("""
                            SELECT p.triggeredBy, COUNT(p)
                            FROM PipelineRun p
                            WHERE p.repository.id = :repoId
                              AND p.startedAt >= :since
                            GROUP BY p.triggeredBy
                            ORDER BY COUNT(p) DESC
                        """)
        List<Object[]> topContributors(
                        @Param("repoId") Long repoId,
                        @Param("since") Instant since);
}