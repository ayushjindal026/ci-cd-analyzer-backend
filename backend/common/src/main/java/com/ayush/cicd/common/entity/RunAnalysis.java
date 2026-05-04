package com.ayush.cicd.common.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Stores the AI analysis result for a failed pipeline run.
 *
 * WHY a separate table and not columns on PipelineRun?
 * Not every run gets analysed — only failed ones.
 * Adding 5 nullable columns to pipeline_runs for the 30% of runs
 * that fail wastes space and pollutes the entity.
 * A separate table = clean separation, optional relationship.
 *
 * WHY OneToOne and not OneToMany?
 * One run has one analysis. If we re-analyse (model upgrade),
 * we update the existing row, not insert a new one.
 */
@Entity
@Table(name = "run_analysis")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunAnalysis extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pipeline_run_id", nullable = false, unique = true)
    
    private PipelineRun pipelineRun;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "root_cause_summary", nullable = false, length = 1000)
    private String rootCauseSummary;

    @Column(name = "suggested_fix", nullable = false, length = 1000)
    private String suggestedFix;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore;

    @Column(name = "analysed_by_model", length = 100)
    private String analysedByModel;

    // Raw log snippet sent to the LLM — useful for debugging analysis quality
    @Column(name = "log_snippet", columnDefinition = "TEXT")
    private String logSnippet;
}