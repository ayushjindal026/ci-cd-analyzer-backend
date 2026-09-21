// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/RunAnalysis.java
// ─────────────────────────────────────────────────────────────────────────────

package com.ayush.cicd.common.entity;

import com.ayush.cicd.common.enums.FailureCategory;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * AI-generated analysis result for a failed PipelineRun.
 *
 * Stores:
 * - AI diagnosis
 * - failure classification
 * - remediation guidance
 * - confidence metadata
 * - flakiness indicators
 */
@Entity
@Table(name = "run_analysis", indexes = {

        @Index(name = "idx_ra_run", columnList = "pipeline_run_id"),
        @Index(name = "idx_ra_repo", columnList = "repository_id"),
        @Index(name = "idx_ra_failure_category", columnList = "failure_category"),
        @Index(name = "idx_ra_severity", columnList = "severity"),
        @Index(name = "idx_ra_confidence", columnList = "confidence_score"),
        @Index(name = "idx_ra_is_flaky", columnList = "is_flaky")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunAnalysis {

    // ─────────────────────────────────────────────────────────────────────
    // IDS
    // ─────────────────────────────────────────────────────────────────────

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pipeline_run_id", nullable = false, unique = true)
    private Long runId;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    // ─────────────────────────────────────────────────────────────────────
    // PIPELINE METADATA
    // ─────────────────────────────────────────────────────────────────────

    @Column(length = 100)
    private String stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_category", length = 50)
    private FailureCategory failureCategory;

    @Column(length = 20)
    private String severity;

    @Column(length = 20)
    private String priority;

    // ─────────────────────────────────────────────────────────────────────
    // AI ANALYSIS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * One-line summary shown in UI cards,
     * notifications, Slack alerts, etc.
     */
    @Column(length = 500)
    private String summary;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    /**
     * Stored as newline-delimited text.
     */
    @Column(name = "remediation_steps", columnDefinition = "TEXT")
    private String remediationSteps;

    /**
     * Similar known failure patterns.
     * Stored as JSON/text.
     */
    @Column(name = "similar_patterns", columnDefinition = "TEXT")
    private String similarPatterns;

    @Column(name = "affected_component", length = 300)
    private String affectedComponent;

    @Column(name = "estimated_fix_time", length = 100)
    private String estimatedFixTime;

    // ─────────────────────────────────────────────────────────────────────
    // CLASSIFICATION METADATA
    // ─────────────────────────────────────────────────────────────────────

    /**
     * 0.0 → 1.0 confidence score
     */
    @Column(name = "confidence_score")
    private Double confidenceScore;

    /**
     * LOCAL | AI | HYBRID
     */
    @Column(name = "classification_source", length = 20)
    private String classificationSource;

    // ─────────────────────────────────────────────────────────────────────
    // FAILURE HISTORY
    // ─────────────────────────────────────────────────────────────────────

    @Column(name = "similar_failures_count")
    private int similarFailuresCount;

    @Column(name = "flakiness_score")
    private double flakinessScore;

    @Column(name = "is_flaky")
    private boolean isFlaky;

    @Column(name = "failing_tests", columnDefinition = "TEXT")
    private String failingTests;

    // ─────────────────────────────────────────────────────────────────────
    // AUDIT
    // ─────────────────────────────────────────────────────────────────────

    @Column(name = "analysed_at", nullable = false)
    @Builder.Default
    private Instant analysedAt = Instant.now();

    @Column(name = "model_used", length = 100)
    private String modelUsed;

}