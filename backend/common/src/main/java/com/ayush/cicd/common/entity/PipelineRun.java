// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/PipelineRun.java

package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.AnalysisStatus;
import com.ayush.cicd.common.enums.BuildStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A single CI/CD pipeline execution — populated by the ingestion-service
 * on webhook receipt or manual sync.
 *
 * Field naming follows the existing entity conventions:
 * - externalRunId (GitHub's run ID as String)
 * - repository (ManyToOne → MonitoredRepository)
 * - headSha (not commitSha)
 * - durationMs (not durationSeconds)
 * - status (BuildStatus enum)
 *
 * Intelligence layer fields:
 * - logsFetched (has the log ZIP been downloaded?)
 * - analysisStatus (where in the AI pipeline is this run?)
 *
 * Audit fields:
 * - createdAt (when the pipeline run was created)
 * - updatedAt (when the pipeline run was last modified)
 */
@Entity
@Table(
        name = "pipeline_runs",
        indexes = {
                @Index(name = "idx_pr_repo", columnList = "repository_id"),
                @Index(name = "idx_pr_status", columnList = "status"),
                @Index(name = "idx_pr_started", columnList = "started_at"),
                @Index(name = "idx_pr_external", columnList = "external_run_id"),
                @Index(name = "idx_pr_analysis", columnList = "analysis_status"),
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * GitHub Actions workflow run ID stored as String.
     */
    @Column(name = "external_run_id", length = 50)
    private String externalRunId;

    /**
     * Repository this pipeline run belongs to.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private MonitoredRepository repository;

    /**
     * GitHub Actions workflow name.
     */
    @Column(name = "workflow_name", length = 200)
    private String workflowName;

    /**
     * Branch on which the workflow ran.
     */
    @Column(length = 200)
    private String branch;

    /**
     * Git commit SHA.
     */
    @Column(name = "head_sha", length = 40)
    private String headSha;

    /**
     * GitHub numeric workflow run ID.
     * Optional but useful for deep links to GitHub.
     */
    @Column(name = "github_run_id")
    private Long githubRunId;

    /**
     * Current build status.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BuildStatus status = BuildStatus.PENDING;

    /**
     * Duration in milliseconds.
     */
    @Column(name = "duration_ms")
    private Long durationMs;

    /**
     * When the pipeline started.
     */
    @Column(name = "started_at")
    private Instant startedAt;

    /**
     * When the pipeline completed.
     */
    @Column(name = "completed_at")
    private Instant completedAt;

    /**
     * What triggered the pipeline:
     * push | pull_request | schedule | workflow_dispatch
     */
    @Column(name = "triggered_by", length = 100)
    private String triggeredBy;

    /**
     * Commit message associated with the pipeline run.
     */
    @Column(name = "commit_message", length = 500)
    private String commitMessage;

    // ─────────────────────────────────────────────────────────────────────────
    // Audit fields
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Timestamp when this pipeline run was created.
     *
     * Database column:
     * pipeline_runs.created_at TIMESTAMPTZ NOT NULL
     */
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * Timestamp when this pipeline run was last updated.
     *
     * Database column:
     * pipeline_runs.updated_at TIMESTAMPTZ NOT NULL
     *
     * This field was previously missing from the entity, which caused
     * PostgreSQL INSERT failures because updated_at is NOT NULL.
     */
    @Column(
            name = "updated_at",
            nullable = false
    )
    @Builder.Default
    private Instant updatedAt = Instant.now();

    // ─────────────────────────────────────────────────────────────────────────
    // Intelligence layer fields
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Whether the pipeline logs have been fetched.
     */
    @Column(name = "logs_fetched")
    @Builder.Default
    private boolean logsFetched = false;

    /**
     * Current state of AI analysis for this pipeline run.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", length = 20)
    @Builder.Default
    private AnalysisStatus analysisStatus = AnalysisStatus.PENDING;

    // ─────────────────────────────────────────────────────────────────────────
    // Entity lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ensures both audit timestamps are populated before INSERT.
     *
     * This protects against cases where an entity is created through
     * a builder or another code path that explicitly sets either field
     * to null.
     */
    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    /**
     * Automatically updates updatedAt before an UPDATE.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Convenience helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Duration as seconds — computed from durationMs for display / metrics.
     */
    @Transient
    public Integer getDurationSeconds() {
        return durationMs != null
                ? (int) (durationMs / 1000)
                : null;
    }

    /**
     * Shortcut used throughout services to avoid repository.getId() chains.
     */
    @Transient
    public Long getRepositoryId() {
        return repository != null
                ? repository.getId()
                : null;
    }
}