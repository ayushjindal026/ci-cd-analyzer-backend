package com.ayush.cicd.analytics.repository;

import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.FailureCategory;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnalyticsRunAnalysisRepository
                extends JpaRepository<RunAnalysis, Long> {

        // ─────────────────────────────────────────────────────────────────────────
        // Run Analysis Lookup
        // ─────────────────────────────────────────────────────────────────────────

        Optional<RunAnalysis> findByRunId(Long runId);

        // ─────────────────────────────────────────────────────────────────────────
        // Repository Analyses
        // ─────────────────────────────────────────────────────────────────────────

        List<RunAnalysis> findByRepositoryIdOrderByIdDesc(
                        Long repositoryId);

        // ─────────────────────────────────────────────────────────────────────────
        // Flaky Analyses
        // ─────────────────────────────────────────────────────────────────────────

        List<RunAnalysis> findByRepositoryIdAndIsFlaky(
                        Long repositoryId,
                        boolean isFlaky);

        // ─────────────────────────────────────────────────────────────────────────
        // Recent Analyses
        // ─────────────────────────────────────────────────────────────────────────

        List<RunAnalysis> findAllByOrderByAnalysedAtDesc(
                        Pageable pageable);

        // ─────────────────────────────────────────────────────────────────────────
        // Root Cause Analytics
        // ─────────────────────────────────────────────────────────────────────────

        List<RunAnalysis> findByRepositoryIdAndFailureCategory(
                        Long repositoryId,
                        FailureCategory failureCategory);

        List<RunAnalysis> findTop50ByRepositoryIdOrderByAnalysedAtDesc(Long repositoryId);
}