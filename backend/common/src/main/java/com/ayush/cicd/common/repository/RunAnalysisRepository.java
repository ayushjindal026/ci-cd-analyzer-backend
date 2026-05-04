package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.RunAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RunAnalysisRepository extends JpaRepository<RunAnalysis, Long> {

    Optional<RunAnalysis> findByPipelineRunId(Long pipelineRunId);

    boolean existsByPipelineRunId(Long pipelineRunId);
    boolean existsByRunId(Long runId);
}