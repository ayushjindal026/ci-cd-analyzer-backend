// ─────────────────────────────────────────────────────────────────────────────
// PATH: backend/common/src/main/java/com/ayush/cicd/common/entity/RunAnalysis.java
package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * AI-generated analysis result for a single failed PipelineRun.
 * One-to-one with a PipelineRun. Returned by GET /runs/{id}/analysis.
 */
@Entity
@Table(name = "run_analyses", indexes = {
    @Index(name = "idx_ra_run",  columnList = "run_id"),
    @Index(name = "idx_ra_repo", columnList = "repository_id"),
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false, unique = true)
    private Long runId;

    @Column(name = "repository_id", nullable = false)
    private Long repositoryId;

    @Column(length = 100)
    private String stage;

    @Column(length = 20)
    private String severity;

    @Column(length = 50)
    private String category;

    /** One-sentence summary shown in UI / notification toasts. */
    @Column(length = 500)
    private String summary;

    @Column(name = "root_cause", length = 1000)
    private String rootCause;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(length = 1000)
    private String recommendation;

    /** Newline-delimited numbered remediation steps. */
    @Column(name = "remediation_steps", columnDefinition = "TEXT")
    private String remediationSteps;

    @Column(name = "affected_component", length = 300)
    private String affectedComponent;

    @Column(name = "estimated_fix_time", length = 100)
    private String estimatedFixTime;

    @Column(length = 5)
    private String priority;            // P1–P4

    @Column(name = "similar_failures_count")
    private int similarFailuresCount;

    @Column(name = "flakiness_score")
    private double flakinessScore;

    @Column(name = "is_flaky")
    private boolean isFlaky;

    @Column(name = "failing_tests", length = 2000)
    private String failingTests;

    @Column(name = "analysed_at")
    private Instant analysedAt;

    @Column(name = "model_used", length = 100)
    private String modelUsed;
}