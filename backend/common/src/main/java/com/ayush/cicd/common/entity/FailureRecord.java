// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/FailureRecord.java
package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.FailureCategory;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * One row per classified pipeline stage failure.
 * Feeds historical analysis + embedding similarity search.
 */
@Entity
@Table(name = "failure_records", indexes = {
        @Index(name = "idx_fr_repo", columnList = "repository_id"),
        @Index(name = "idx_fr_signature", columnList = "signature"),
        @Index(name = "idx_fr_occurred", columnList = "occurred_at"),
        @Index(name = "idx_fr_cat_stage", columnList = "category, stage"),
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to PipelineRun.id */
    @Column(name = "run_id", nullable = false)
    private Long runId;

    /** FK to MonitoredRepository.id (via repository.getId()) */
    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(nullable = false, length = 100)
    private String stage;

    @Column(nullable = false, length = 50)
    private String category; // maps to FailureCategory enum name

    @Column(nullable = false, length = 20)
    private String severity; // LOW | MEDIUM | HIGH | CRITICAL

    @Column(name = "root_cause_line", length = 1000)
    private String rootCauseLine;

    @Column(name = "failing_tests", length = 2000)
    private String failingTests; // pipe-delimited test names

    @Column(name = "stack_trace_summary", columnDefinition = "TEXT")
    private String stackTraceSummary;

    @Column(name = "exit_code", length = 10)
    private String exitCode;

    @Column(name = "is_oom")
    private boolean isOom;

    @Column(name = "is_timeout")
    private boolean isTimeout;

    @Column(name = "failing_step", length = 500)
    private String failingStep;

    @Column(name = "flakiness_score")
    private double flakinessScore;

    /** 8-char hex fingerprint — groups same error across different runs. */
    @Column(nullable = false, length = 20)
    private String signature;

    @Column(name = "condensed_log", columnDefinition = "TEXT")
    private String condensedLog;

    /**
     * Serialised float[] from text-embedding-3-small. Stored as comma-delimited
     * TEXT.
     */
    @Column(columnDefinition = "TEXT")
    private String embedding;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}