package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Stores compressed CI/CD pipeline logs.
 *
 * Features:
 * - Per-stage log storage
 * - Compression support
 * - Fast searchable error previews
 * - Repository-level analytics
 * - Cleanup support
 */
@Entity
@Table(name = "pipeline_logs",

        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pipeline_log_run_stage", columnNames = {
                        "run_id",
                        "stage"
                })
        },

        indexes = {
                @Index(name = "idx_pl_run_id", columnList = "run_id"),

                @Index(name = "idx_pl_repo_stage", columnList = "repository_id, stage"),

                @Index(name = "idx_pl_stored_at", columnList = "stored_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineLog {

    // =========================================================================
    // PRIMARY KEY
    // =========================================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // RELATIONS
    // =========================================================================

    /**
     * Pipeline run ID.
     */
    @Column(name = "run_id", nullable = false)
    private Long runId;

    /**
     * Repository ID.
     */
    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    // =========================================================================
    // PIPELINE METADATA
    // =========================================================================

    /**
     * Pipeline stage:
     * Checkout | Build | Test | Docker | Deploy
     */
    @Column(nullable = false, length = 100)
    private String stage;

    // =========================================================================
    // LOG STORAGE
    // =========================================================================

    /**
     * GZIP compressed log bytes.
     */
    @Lob
    @Column(name = "compressed_log", nullable = false, columnDefinition = "BYTEA")
    private byte[] compressedLog;

    /**
     * Original uncompressed log size.
     */
    @Column(name = "raw_size_bytes")
    @Builder.Default
    private int rawSizeBytes = 0;

    /**
     * Compressed size.
     */
    @Column(name = "compressed_size_bytes")
    @Builder.Default
    private int compressedSizeBytes = 0;

    // =========================================================================
    // SEARCHABLE ERROR PREVIEW
    // =========================================================================

    /**
     * Extracted error summary for fast searching
     * without decompression.
     */
    @Column(name = "error_preview", length = 1000)
    private String errorPreview;

    // =========================================================================
    // TIMESTAMPS
    // =========================================================================

    /**
     * Log creation timestamp.
     */
    @Column(name = "stored_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant storedAt = Instant.now();

    // =========================================================================
    // HELPERS
    // =========================================================================

    @Transient
    public boolean hasErrors() {
        return errorPreview != null
                && !errorPreview.isBlank();
    }

    @Transient
    public double compressionRatio() {

        if (rawSizeBytes <= 0) {
            return 0;
        }

        return ((double) compressedSizeBytes / rawSizeBytes);
    }
}