package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.PipelineLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
@Transactional(readOnly = true)
public interface PipelineLogRepository
                extends JpaRepository<PipelineLog, Long> {

        // =========================================================================
        // PRIMARY LOOKUPS
        // =========================================================================

        Optional<PipelineLog> findByRunIdAndStage(
                        Long runId,
                        String stage);

        List<PipelineLog> findByRunIdOrderByStoredAtAsc(
                        Long runId);

        List<PipelineLog> findByRepositoryIdOrderByStoredAtDesc(
                        Long repositoryId);

        // =========================================================================
        // EXISTENCE / COUNTS
        // =========================================================================

        boolean existsByRunIdAndStage(
                        Long runId,
                        String stage);

        long countByRunId(Long runId);

        long countByRepositoryId(Long repositoryId);

        // =========================================================================
        // CLEANUP
        // =========================================================================

        @Modifying
        @Transactional
        @Query("""
                            DELETE FROM PipelineLog p
                            WHERE p.repositoryId = :repositoryId
                        """)
        int deleteByRepositoryId(
                        @Param("repositoryId") Long repositoryId);

        @Modifying
        @Transactional
        @Query("""
                            DELETE FROM PipelineLog p
                            WHERE p.runId = :runId
                        """)
        int deleteByRunId(
                        @Param("runId") Long runId);

        @Modifying
        @Transactional
        @Query("""
                            DELETE FROM PipelineLog l
                            WHERE l.storedAt < :before
                        """)
        int deleteOlderThan(
                        @Param("before") Instant before);

        // =========================================================================
        // ANALYTICS
        // =========================================================================

        @Query("""
                            SELECT p
                            FROM PipelineLog p
                            ORDER BY p.rawSizeBytes DESC
                        """)
        List<PipelineLog> findLargestLogs(
                        Pageable pageable);

        @Query("""
                            SELECT p
                            FROM PipelineLog p
                            WHERE p.errorPreview IS NOT NULL
                              AND p.errorPreview <> ''
                            ORDER BY p.storedAt DESC
                        """)
        List<PipelineLog> findRecentErrorLogs(
                        Pageable pageable);

        @Query("""
                            SELECT p
                            FROM PipelineLog p
                            WHERE LOWER(p.errorPreview)
                                  LIKE LOWER(CONCAT('%', :query, '%'))
                            ORDER BY p.storedAt DESC
                        """)
        List<PipelineLog> searchErrorPreview(
                        @Param("query") String query,
                        Pageable pageable);

        // =========================================================================
        // STORAGE STATS
        // =========================================================================

        @Query("""
                            SELECT l.stage,
                                   COUNT(l),
                                   SUM(l.rawSizeBytes),
                                   SUM(l.compressedSizeBytes)
                            FROM PipelineLog l
                            WHERE l.repositoryId = :repoId
                            GROUP BY l.stage
                        """)
        List<Object[]> storageStatsByStage(
                        @Param("repoId") Long repositoryId);
}