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
 * Field naming follows your existing entity conventions:
 * - externalRunId (GitHub's run ID as String)
 * - repository (ManyToOne → MonitoredRepository)
 * - headSha (not commitSha)
 * - durationMs (not durationSeconds)
 * - status (BuildStatus enum)
 *
 * Two new fields added for the intelligence layer:
 * - logsFetched (has the log ZIP been downloaded?)
 * - analysisStatus (where in the AI pipeline is this run?)
 */
@Entity
@Table(name = "pipeline_runs", indexes = {
        @Index(name = "idx_pr_repo", columnList = "repository_id"),
        @Index(name = "idx_pr_status", columnList = "status"),
        @Index(name = "idx_pr_started", columnList = "started_at"),
        @Index(name = "idx_pr_external", columnList = "external_run_id"),
        @Index(name = "idx_pr_analysis", columnList = "analysis_status"),
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** GitHub Actions workflow run ID (stored as String). */
    @Column(name = "external_run_id", length = 50)
    private String externalRunId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private MonitoredRepository repository;

    @Column(name = "workflow_name", length = 200)
    private String workflowName;

    @Column(length = 200)
    private String branch;

    /** Git commit SHA (headSha per your convention). */
    @Column(name = "head_sha", length = 40)
    private String headSha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BuildStatus status = BuildStatus.PENDING;

    /** Duration in milliseconds (durationMs per your convention). */
    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "triggered_by", length = 100)
    private String triggeredBy; // push | pull_request | schedule | workflow_dispatch

    @Column(name = "commit_message", length = 500)
    private String commitMessage;

    // ── Intelligence layer fields ─────────────────────────────────────────────

    @Column(name = "logs_fetched")
    @Builder.Default
    private boolean logsFetched = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", length = 20)
    @Builder.Default
    private AnalysisStatus analysisStatus = AnalysisStatus.PENDING;

    // ── Convenience helpers ───────────────────────────────────────────────────

    /** Duration as seconds — computed from durationMs for display / metrics. */
    @Transient
    public Integer getDurationSeconds() {
        return durationMs != null ? (int) (durationMs / 1000) : null;
    }

    /** Shortcut used throughout services to avoid repository.getId() chains. */
    @Transient
    public Long getRepositoryId() {
        return repository != null ? repository.getId() : null;
    }
}