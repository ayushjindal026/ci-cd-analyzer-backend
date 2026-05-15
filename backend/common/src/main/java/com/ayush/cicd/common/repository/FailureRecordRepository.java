// PATH: backend/src/main/java/com/pipelineiq/analyzer/repository/FailureRecordRepository.java
package com.ayush.cicd.common.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ayush.cicd.common.entity.FailureRecord;

import java.time.Instant;
import java.util.List;

@Repository
public interface FailureRecordRepository extends JpaRepository<FailureRecord, Long> {

  List<FailureRecord> findByRepositoryIdAndOccurredAtAfter(Long repoId, Instant since);

  List<FailureRecord> findBySignatureAndRepositoryId(String signature, Long repoId);

  List<FailureRecord> findByCategoryAndStageAndRepositoryId(
      String category, String stage, Long repoId);

  List<FailureRecord> findByRepositoryIdAndEmbeddingIsNotNull(Long repoId);

  long countByRepositoryIdAndFailingTestsContainingAndOccurredAtAfter(
      Long repoId, String test, Instant since);

  @Query("""
          SELECT f FROM FailureRecord f
          WHERE f.repositoryId = :repoId
          ORDER BY f.occurredAt DESC
          LIMIT 100
      """)
  List<FailureRecord> findRecentByRepo(Long repoId);

  @Query("""
          SELECT f.category, COUNT(f) as cnt
          FROM FailureRecord f
          WHERE f.repositoryId = :repoId
            AND f.occurredAt > :since
          GROUP BY f.category
          ORDER BY cnt DESC
      """)
  List<Object[]> countByCategory(Long repoId, Instant since);

  @Query("""
          SELECT f.stage, COUNT(f) as cnt
          FROM FailureRecord f
          WHERE f.repositoryId = :repoId
            AND f.occurredAt > :since
          GROUP BY f.stage
          ORDER BY cnt DESC
      """)
  List<Object[]> countByStage(Long repoId, Instant since);
}