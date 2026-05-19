package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.PipelineLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository for compressed pipeline log storage.
 *
 * WHY separate log storage?
 * Pipeline logs can become extremely large and should not be loaded
 * together with PipelineRun entities.
 *
 * This repository supports:
 * - Fast lookup by run/stage
 * - Cleanup of old logs
 * - AI re-analysis retrieval
 * - Historical diagnostics
 * - Future semantic indexing
 */
@Repository
public interface PipelineLogRepository
        extends JpaRepository<PipelineLog, Long> {

    // ─────────────────────────────────────────────────────────────────────────
    // Primary lookups
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fetch a single stored log for a specific stage in a pipeline run.
     *
     * Example:
     * Build stage log
     * Test stage log
     * Deploy stage log
     */
    Optional<PipelineLog> findByRunIdAndStage(
            Long runId,
            String stage
    );

    /**
     * All logs for a pipeline run.
     *
     * Ordered for consistent UI rendering.
     */
    List<PipelineLog> findByRunIdOrderByCreatedAtAsc(
            Long runId
    );

    /**
     * All logs for a repository.
     *
     * Useful for:
     * - historical diagnostics
     * - AI trend analysis
     * - semantic search later
     */
    List<PipelineLog> findByRepositoryIdOrderByCreatedAtDesc(
            Long repositoryId
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Existence checks
    // ─────────────────────────────────────────────────────────────────────────

    boolean existsByRunIdAndStage(
            Long runId,
            String stage
    );

    long countByRunId(Long runId);

    long countByRepositoryId(Long repositoryId);

    // ─────────────────────────────────────────────────────────────────────────
    // Cleanup operations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Delete logs older than a timestamp.
     *
     * Used by scheduled retention cleanup.
     */
    @Modifying
    @Query("""
        DELETE FROM PipelineLog p
        WHERE p.createdAt < :before
    """)
    int deleteOlderThan(
            @Param("before")
            Instant before
    );

    /**
     * Delete all logs for a repository.
     *
     * Used when:
     * - repo disconnected
     * - GDPR deletion
     * - hard cleanup
     */
    @Modifying
    @Query("""
        DELETE FROM PipelineLog p
        WHERE p.repositoryId = :repositoryId
    """)
    int deleteByRepositoryId(
            @Param("repositoryId")
            Long repositoryId
    );

    /**
     * Delete logs for a specific pipeline run.
     */
    @Modifying
    @Query("""
        DELETE FROM PipelineLog p
        WHERE p.runId = :runId
    """)
    int deleteByRunId(
            @Param("runId")
            Long runId
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Analytics helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Largest stored logs.
     *
     * Helps detect:
     * - runaway builds
     * - spammy logging
     * - oversized stack traces
     */
    @Query("""
        SELECT p
        FROM PipelineLog p
        ORDER BY p.rawSizeBytes DESC
    """)
    List<PipelineLog> findLargestLogs();

    /**
     * Recent logs containing detected error previews.
     *
     * Useful for:
     * - AI ingestion queue
     * - alerting
     * - dashboard widgets
     */
    @Query("""
        SELECT p
        FROM PipelineLog p
        WHERE p.errorPreview IS NOT NULL
          AND p.errorPreview <> ''
        ORDER BY p.createdAt DESC
    """)
    List<PipelineLog> findRecentErrorLogs();

    // ─────────────────────────────────────────────────────────────────────────
    // Future AI / semantic search support
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Search logs by keyword preview.
     *
     * Lightweight fallback before vector search.
     */
    @Query("""
        SELECT p
        FROM PipelineLog p
        WHERE LOWER(p.errorPreview)
              LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY p.createdAt DESC
    """)
    List<PipelineLog> searchErrorPreview(
            @Param("query")
            String query
    );
}