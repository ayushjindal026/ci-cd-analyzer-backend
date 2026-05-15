package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.FailureCategory;
import com.ayush.cicd.common.repository.FailureRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FailureClassifierService {

        private final FailureRecordRepository failureRepo;

        private final EmbeddingService embeddingService;

        // =====================================================
        // Classify + Persist Failure
        // =====================================================

        public FailureRecord classify(
                        PipelineRun run,
                        LogParserService.ParsedLog parsed) {

                FlakinessScore flaky = scoreFlakiness(run, parsed);

                Severity severity = deriveSeverity(parsed, flaky);

                String signature = buildSignature(parsed);

                FailureRecord record = FailureRecord.builder()

                                .runId(run.getId())

                                // IMPORTANT:
                                // Uses helper method from entity
                                .repositoryId(run.getRepository().getId())

                                .stage(parsed.getStage())

                                .category(parsed.getCategory().name())

                                .severity(severity.name())

                                .rootCauseLine(parsed.getRootCauseLine())

                                .failingTests(
                                                String.join(
                                                                "|",
                                                                parsed.getFailingTests()))

                                .stackTraceSummary(
                                                summariseStack(
                                                                parsed.getStackTrace()))

                                .exitCode(parsed.getExitCode())

                                .isOom(parsed.isOom())

                                .isTimeout(parsed.isTimeout())

                                .failingStep(parsed.getFailingStep())

                                .flakinessScore(flaky.score())

                                .signature(signature)

                                .condensedLog(parsed.getCondensedLog())

                                .occurredAt(
                                                run.getStartedAt() != null
                                                                ? run.getStartedAt()
                                                                : Instant.now())

                                .build();

                FailureRecord saved = failureRepo.save(record);

                // Async embedding generation
                embeddingService.embedAsync(saved);

                return saved;
        }

        // =====================================================
        // Similar Failure Lookup
        // =====================================================

        public List<FailureRecord> findSimilar(
                        FailureRecord current,
                        int topN) {

                List<FailureRecord> bySignature = failureRepo.findBySignatureAndRepositoryId(
                                current.getSignature(),
                                current.getRepositoryId());

                if (bySignature.size() >= topN) {

                        return bySignature.stream()

                                        .filter(r -> !Objects.equals(
                                                        r.getId(),
                                                        current.getId()))

                                        .limit(topN)

                                        .collect(Collectors.toList());
                }

                // Embedding similarity
                if (current.getEmbedding() != null) {

                        return embeddingService.findSimilarByEmbedding(
                                        current,
                                        topN);
                }

                // Fallback category + stage similarity
                return failureRepo
                                .findByCategoryAndStageAndRepositoryId(
                                                current.getCategory(),
                                                current.getStage(),
                                                current.getRepositoryId())
                                .stream()

                                .filter(r -> !Objects.equals(
                                                r.getId(),
                                                current.getId()))

                                .limit(topN)

                                .collect(Collectors.toList());
        }

        // =====================================================
        // Historical Stats
        // =====================================================

        public FailureStats getStats(
                        Long repositoryId,
                        int days) {

                Instant since = Instant.now()
                                .minusSeconds((long) days * 86400);

                List<FailureRecord> recent = failureRepo.findByRepositoryIdAndOccurredAtAfter(
                                repositoryId,
                                since);

                Map<String, Long> byCategory = recent.stream()

                                .collect(Collectors.groupingBy(
                                                FailureRecord::getCategory,
                                                Collectors.counting()));

                Map<String, Long> byStage = recent.stream()

                                .collect(Collectors.groupingBy(
                                                FailureRecord::getStage,
                                                Collectors.counting()));

                List<String> flakyTests = recent.stream()

                                .filter(r -> r.getFailingTests() != null
                                                && !r.getFailingTests().isBlank())

                                .flatMap(r -> Arrays.stream(
                                                r.getFailingTests().split("\\|")))

                                .collect(Collectors.groupingBy(
                                                t -> t,
                                                Collectors.counting()))

                                .entrySet()
                                .stream()

                                .filter(e -> e.getValue() >= 2)

                                .sorted(
                                                Map.Entry
                                                                .<String, Long>comparingByValue()
                                                                .reversed())

                                .limit(10)

                                .map(e -> e.getKey()
                                                + " ("
                                                + e.getValue()
                                                + "×)")

                                .collect(Collectors.toList());

                List<String> topRootCauses = recent.stream()

                                .filter(r -> r.getRootCauseLine() != null)

                                .collect(Collectors.groupingBy(
                                                FailureRecord::getRootCauseLine,
                                                Collectors.counting()))

                                .entrySet()
                                .stream()

                                .sorted(
                                                Map.Entry
                                                                .<String, Long>comparingByValue()
                                                                .reversed())

                                .limit(5)

                                .map(Map.Entry::getKey)

                                .collect(Collectors.toList());

                return new FailureStats(
                                recent.size(),
                                byCategory,
                                byStage,
                                flakyTests,
                                topRootCauses,
                                days);
        }

        // =====================================================
        // Helpers
        // =====================================================

        private FlakinessScore scoreFlakiness(
                        PipelineRun run,
                        LogParserService.ParsedLog parsed) {

                if (parsed.getFailingTests().isEmpty()) {
                        return new FlakinessScore(0.0);
                }

                long recurrences = failureRepo
                                .countByRepositoryIdAndFailingTestsContainingAndOccurredAtAfter(
                                                run.getRepository().getId(),
                                                parsed.getFailingTests().get(0),
                                                Instant.now().minusSeconds(7 * 86400));

                return new FlakinessScore(
                                Math.min(1.0, recurrences / 5.0));
        }

        private Severity deriveSeverity(
                        LogParserService.ParsedLog parsed,
                        FlakinessScore flaky) {

                if (parsed.isOom() || parsed.isTimeout()) {
                        return Severity.CRITICAL;
                }

                if (parsed.getCategory() == FailureCategory.TEST_FAILURE
                                && flaky.score() > 0.6) {

                        return Severity.MEDIUM;
                }

                if (parsed.getCategory() == FailureCategory.COMPILATION_ERROR
                                || parsed.getCategory() == FailureCategory.BUILD_ERROR) {

                        return Severity.HIGH;
                }

                if (!parsed.getStackTrace().isEmpty()) {
                        return Severity.HIGH;
                }

                return Severity.MEDIUM;
        }

        private String buildSignature(
                        LogParserService.ParsedLog parsed) {

                String base = parsed.getCategory().name()
                                + "|"
                                + parsed.getStage()
                                + "|"
                                + Objects.toString(
                                                parsed.getRootCauseLine(),
                                                "")
                                + "|"
                                + String.join(
                                                ",",
                                                parsed.getFailingTests());

                return String.format(
                                "%08x",
                                base.hashCode());
        }

        private String summariseStack(
                        List<String> stack) {

                return stack.stream()

                                .limit(8)

                                .collect(Collectors.joining("\n"));
        }

        // =====================================================
        // Inner Types
        // =====================================================

        public enum Severity {
                LOW,
                MEDIUM,
                HIGH,
                CRITICAL
        }

        public record FlakinessScore(
                        double score) {
        }

        public record FailureStats(
                        int totalFailures,
                        Map<String, Long> byCategory,
                        Map<String, Long> byStage,
                        List<String> flakyTests,
                        List<String> topRootCauses,
                        int windowDays) {
        }
}