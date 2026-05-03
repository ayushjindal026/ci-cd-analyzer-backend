package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.BuildStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A single stage/step within a pipeline run.
 *
 * WHY a separate table and not a JSON column on PipelineRun?
 * We query stages independently: "which stage fails most often across all runs?"
 * A JSON column cannot be indexed or aggregated in SQL.
 * Proper normalization = proper analytics.
 */
@Entity
@Table(
    name = "pipeline_stages",
    indexes = {
        @Index(name = "idx_stages_run_id",     columnList = "pipeline_run_id"),
        @Index(name = "idx_stages_name_status", columnList = "stage_name, status")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineStage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pipeline_run_id", nullable = false)
    private PipelineRun pipelineRun;

    @Column(name = "stage_name", nullable = false, length = 255)
    private String stageName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BuildStatus status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "step_order")
    private Integer stepOrder;
}