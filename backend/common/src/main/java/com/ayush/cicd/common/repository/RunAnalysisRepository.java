// PATH: backend/common/src/main/java/com/ayush/cicd/common/repository/RunAnalysisRepository.java
package com.ayush.cicd.common.repository;

import com.ayush.cicd.common.entity.RunAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RunAnalysisRepository extends JpaRepository<RunAnalysis, Long> {

  Optional<RunAnalysis> findByRunId(Long runId);

  boolean existsByRunId(Long runId);

  List<RunAnalysis> findByRepositoryIdOrderByAnalysedAtDesc(Long repositoryId);

  List<RunAnalysis> findTop50ByRepositoryIdOrderByAnalysedAtDesc(Long repositoryId);

  List<RunAnalysis> findByRepositoryIdAndIsFlaky(Long repositoryId, boolean isFlaky);

  List<RunAnalysis> findByRepositoryIdAndPriority(Long repositoryId, String priority);

  long countByRepositoryIdAndSeverity(Long repositoryId, String severity);

  long countByRepositoryIdAndIsFlaky(Long repositoryId, boolean isFlaky);

  List<RunAnalysis> findTop5ByRepositoryIdAndSeverityInOrderByAnalysedAtDesc(
      Long repositoryId,
      List<String> severities);

}