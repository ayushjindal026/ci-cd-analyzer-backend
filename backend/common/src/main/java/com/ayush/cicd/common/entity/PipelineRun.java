package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.BuildStatus;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A single pipeline execution — one GitHub Actions workflow run or one Jenkins build.
 *
 * WHY store headSha?
 * Flaky test detection works by comparing runs on the SAME commit SHA.
 * A job that FAILs then PASSes on the same SHA (without a code change)
 * is flaky. Without headSha, you cannot make that distinction.
 *
 * WHY durationMs as Long, not int?
 * int overflows at ~24 days of milliseconds. A long build won't overflow Long.
 * Also needed for cost calculation: hourly_rate / 3_600_000 * durationMs.
 *
 * WHY externalRunId as String, not Long?
 * GitHub Actions uses numeric IDs. Jenkins uses strings like "42" or "#42".
 * String covers both without separate columns per source.
 */
@Entity
@Table(
    name = "pipeline_runs",
    indexes = {
        @Index(name = "idx_runs_repo_status",  columnList = "repository_id, status"),
        @Index(name = "idx_runs_repo_started", columnList = "repository_id, started_at DESC"),
        @Index(name = "idx_runs_head_sha",     columnList = "head_sha")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineRun extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * WHY @ManyToOne with LAZY fetch?
     * The FK column (repository_id) lives on this side — PipelineRun is
     * the "many" side and owns the relationship.
     * LAZY means the repo object is not loaded unless explicitly accessed.
     * Most run queries only need repository_id, not the full repo object.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "repository_id", nullable = false)
    @JsonIgnore
    private MonitoredRepository repository;

    @Column(name = "external_run_id", nullable = false, length = 100)
    private String externalRunId;

    @Column(name = "workflow_name", nullable = false, length = 255)
    private String workflowName;

    @Column(name = "branch", length = 100)
    private String branch;

    @Column(name = "head_sha", length = 40)
    private String headSha;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BuildStatus status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "run_url", length = 500)
    private String runUrl;

    @Column(name = "is_pull_request")
    @Builder.Default
    private boolean pullRequest = false;

    /**
     * WHY orphanRemoval = true here, but NOT on MonitoredRepository.runs?
     * Stages have no meaning without their parent run — true ownership.
     * Deleting a run should delete its stages.
     * But runs should outlive their repo (historical analytics),
     * so MonitoredRepository does NOT use orphanRemoval on runs.
     */

    @OneToMany(
        mappedBy = "pipelineRun",
        cascade = CascadeType.ALL,
        fetch = FetchType.LAZY,
        orphanRemoval = true
    )
    @JsonIgnore
    @Builder.Default
    private List<PipelineStage> stages = new ArrayList<>();
}