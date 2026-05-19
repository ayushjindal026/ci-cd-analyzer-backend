// ═══════════════════════════════════════════════════════════════════════════════
// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/PipelineLog.java
// ═══════════════════════════════════════════════════════════════════════════════
package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persisted + compressed log for a single pipeline run stage.
 *
 * WHY persist logs?
 * - Re-analysis without re-fetching from GitHub (logs expire after 90 days on
 * GitHub)
 * - Full-text search across historical failures
 * - Diff logs between runs to spot regressions
 *
 * WHY GZIP compress?
 * - Raw CI logs are typically 50–500 KB of repetitive text
 * - GZIP achieves 85–95% compression on log text
 * - Keeps DB storage cost low at scale
 *
 * Storage estimate: 10K runs × 5 stages × avg 20 KB compressed = ~1 GB / 10K
 * runs
 */
@Entity
@Table(
name = "pipeline_logs",

uniqueConstraints = {
    @UniqueConstraint(
        name = "uk_pipeline_log_run_stage",
        columnNames = {
            "run_id",
            "stage"
        }
    )
}, indexes = {
    @Index(name = "idx_pl_run_id", columnList = "run_id"),
    @Index(name = "idx_pl_repo_stage", columnList = "repository_id, stage"),
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    /** Stage name: Checkout | Build | Test | Docker | Deploy */
    @Column(nullable = false, length = 100)
    private String stage;

    /**
     * GZIP-compressed raw log text.
     * Use LogStorageService.compress() / decompress() to read/write.
     */
    @Column(name = "compressed_log", columnDefinition = "BYTEA", nullable = false)
    private byte[] compressedLog;

    /**
     * Original uncompressed size in bytes — useful for stats and decompression
     * buffer.
     */
    @Column(name = "raw_size_bytes")
    private int rawSizeBytes;

    /** Compressed size in bytes. */
    @Column(name = "compressed_size_bytes")
    private int compressedSizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /** First 500 chars of error lines — queryable without decompression. */
    @Column(name = "error_preview", length = 500)
    private String errorPreview;
}