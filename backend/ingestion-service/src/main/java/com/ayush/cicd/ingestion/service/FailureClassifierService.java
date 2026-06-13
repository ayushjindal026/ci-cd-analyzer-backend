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
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FailureClassifierService {

        // ─────────────────────────────────────────────────────────────────────
        // CONFIG
        // ─────────────────────────────────────────────────────────────────────

        private static final double CONFIDENCE_THRESHOLD = 0.55;

        private final FailureRecordRepository failureRepo;
        private final EmbeddingService embeddingService;

        // ─────────────────────────────────────────────────────────────────────
        // PATTERN REGISTRY
        // ─────────────────────────────────────────────────────────────────────

        private static final List<PatternEntry> PATTERNS = List.of(

                        // BUILD
                        entry(r("cannot find symbol|compilation failed|BUILD FAILURE.*compile"),
                                        FailureCategory.BUILD_COMPILATION, 0.9),

                        entry(r("could not resolve|dependency resolution failed|npm ERR! 404"),
                                        FailureCategory.BUILD_DEPENDENCY, 0.85),

                        entry(r("outofmemoryerror|java heap space|GC overhead limit"),
                                        FailureCategory.BUILD_TOOL, 0.8),

                        entry(r("build timeout|timed out after"),
                                        FailureCategory.BUILD_TIMEOUT, 0.9),

                        // TESTS
                        entry(r("tests run:.*failures|AssertionError|test.*FAILED"),
                                        FailureCategory.TEST_UNIT, 0.85),

                        entry(r("integration.*test.*fail|testcontainers.*error"),
                                        FailureCategory.TEST_INTEGRATION, 0.75),

                        entry(r("flaky|retry|intermittent"),
                                        FailureCategory.TEST_FLAKY, 0.7),

                        entry(r("coverage.*below|jacoco.*violation"),
                                        FailureCategory.TEST_COVERAGE, 0.9),

                        // DOCKER
                        entry(r("docker build.*failed|error building image"),
                                        FailureCategory.DOCKER_BUILD, 0.9),

                        entry(r("denied: requested access|docker push"),
                                        FailureCategory.DOCKER_PUSH, 0.85),

                        entry(r("imagepullbackoff|failed to pull image"),
                                        FailureCategory.DOCKER_PULL, 0.85),

                        entry(r("oom.*kill|memory limit exceeded"),
                                        FailureCategory.CONTAINER_OOM, 0.9),

                        // NETWORK
                        entry(r("connection timed out|socket timeout"),
                                        FailureCategory.NETWORK_TIMEOUT, 0.8),

                        entry(r("could not resolve host|dns"),
                                        FailureCategory.NETWORK_DNS, 0.9),

                        // INFRA
                        entry(r("no space left on device|disk quota exceeded"),
                                        FailureCategory.INFRA_RESOURCE, 0.95),

                        entry(r("runner.*offline|no runners.*online"),
                                        FailureCategory.INFRA_RUNNER, 0.9),

                        // K8S
                        entry(r("helm.*failed|kubectl.*error"),
                                        FailureCategory.K8S_DEPLOY, 0.85),

                        entry(r("readiness probe failed|crashloopbackoff"),
                                        FailureCategory.K8S_HEALTH_CHECK, 0.9),

                        entry(r("imagepullbackoff|errimagepull"),
                                        FailureCategory.K8S_IMAGE_PULL, 0.9),

                        entry(r("configmap.*not found|rbac.*forbidden"),
                                        FailureCategory.K8S_CONFIG, 0.85),

                        // QUALITY
                        entry(r("eslint.*error|checkstyle.*violation"),
                                        FailureCategory.LINTING, 0.85),

                        entry(r("sonarqube.*failed|spotbugs.*error"),
                                        FailureCategory.STATIC_ANALYSIS, 0.85),

                        entry(r("trivy.*critical|cve-[0-9]{4}"),
                                        FailureCategory.SECURITY_SCAN, 0.85),

                        entry(r("secret detected|gitleaks"),
                                        FailureCategory.SECRET_DETECTION, 0.95),

                        // AUTH
                        entry(r("401 unauthorized|invalid token"),
                                        FailureCategory.AUTH_CREDENTIALS, 0.8),

                        entry(r("permission denied|access denied"),
                                        FailureCategory.AUTH_PERMISSIONS, 0.75),

                        // CONFIG
                        entry(r("environment variable.*not set"),
                                        FailureCategory.CONFIG_MISSING_ENV, 0.85),

                        entry(r("yaml.*error|invalid.*configuration"),
                                        FailureCategory.CONFIG_INVALID, 0.8),

                        entry(r("version mismatch|requires node"),
                                        FailureCategory.ENV_MISMATCH, 0.8));

        // ─────────────────────────────────────────────────────────────────────
        // MAIN CLASSIFICATION
        // ─────────────────────────────────────────────────────────────────────

        public FailureRecord classify(
                        PipelineRun run,
                        LogParserService.ParsedLog parsed) {

                ClassificationResult classification = classifyLog(parsed.getCondensedLog());

                FlakinessScore flaky = scoreFlakiness(run, parsed);

                String severity = deriveSeverity(
                                classification.category(),
                                classification.confidence(),
                                flaky);

                String signature = buildSignature(parsed);

                FailureRecord record = FailureRecord.builder()

                                .runId(run.getId())

                                .repositoryId(run.getRepository().getId())

                                .stage(parsed.getStage())

                                .category(classification.category().name())

                                .severity(severity)

                                .rootCauseLine(parsed.getRootCauseLine())

                                .failingTests(String.join(
                                                "|",
                                                parsed.getFailingTests()))

                                .stackTraceSummary(
                                                summariseStack(parsed.getStackTrace()))

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

                embeddingService.embedAsync(saved);

                return saved;
        }

        // ─────────────────────────────────────────────────────────────────────
        // AI STYLE CLASSIFICATION
        // ─────────────────────────────────────────────────────────────────────

        public ClassificationResult classifyLog(String logText) {

                if (logText == null || logText.isBlank()) {
                        return ClassificationResult.unknown(0.0);
                }

                String normalized = logText.toLowerCase();

                Map<FailureCategory, Double> scores = new EnumMap<>(FailureCategory.class);

                List<String> matchedSignals = new ArrayList<>();

                for (PatternEntry entry : PATTERNS) {

                        if (entry.pattern().matcher(normalized).find()) {

                                scores.merge(
                                                entry.category(),
                                                entry.weight(),
                                                Double::sum);

                                matchedSignals.add(entry.category().name());
                        }
                }

                if (scores.isEmpty()) {
                        return ClassificationResult.unknown(0.0);
                }

                FailureCategory best = null;
                double bestScore = 0;

                for (Map.Entry<FailureCategory, Double> e : scores.entrySet()) {

                        double normalizedScore = Math.min(e.getValue(), 1.0);

                        if (normalizedScore > bestScore) {

                                bestScore = normalizedScore;
                                best = e.getKey();
                        }
                }

                if (best == null || bestScore < CONFIDENCE_THRESHOLD) {

                        return ClassificationResult.unknown(bestScore);
                }

                return new ClassificationResult(
                                best,
                                bestScore,
                                matchedSignals,
                                true);
        }

        // ─────────────────────────────────────────────────────────────────────
        // SIMILAR FAILURES
        // ─────────────────────────────────────────────────────────────────────

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

                if (current.getEmbedding() != null) {

                        return embeddingService.findSimilarByEmbedding(
                                        current,
                                        topN);
                }

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

        // ─────────────────────────────────────────────────────────────────────
        // STATS
        // ─────────────────────────────────────────────────────────────────────

        public FailureStats getStats(
                        Long repositoryId,
                        int days) {

                Instant since = Instant.now().minusSeconds((long) days * 86400);

                List<FailureRecord> recent = failureRepo.findByRepositoryIdAndOccurredAtAfter(
                                repositoryId,
                                since);

                Map<String, Long> byCategory = recent.stream()

                                .collect(Collectors.groupingBy(
                                                FailureRecord::getCategory,
                                                Collectors.counting()));

                return new FailureStats(
                                byCategory,
                                recent.size());
        }

        // ─────────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────────

        private FlakinessScore scoreFlakiness(
                        PipelineRun run,
                        LogParserService.ParsedLog parsed) {

                if (parsed.getFailingTests().isEmpty()) {
                        return new FlakinessScore(0.0, 0, 0);
                }

                long recurrences = failureRepo
                                .countByRepositoryIdAndFailingTestsContainingAndOccurredAtAfter(
                                                run.getRepository().getId(),
                                                parsed.getFailingTests().get(0),
                                                Instant.now().minusSeconds(7 * 86400));

                return new FlakinessScore(
                                Math.min(1.0, recurrences / 5.0),
                                5,
                                (int) recurrences);
        }

        private String deriveSeverity(
                        FailureCategory category,
                        double confidence,
                        FlakinessScore flaky) {

                if (Set.of(
                                FailureCategory.SECRET_DETECTION,
                                FailureCategory.SECURITY_SCAN,
                                FailureCategory.CONTAINER_OOM,
                                FailureCategory.INFRA_RESOURCE).contains(category)) {

                        return "CRITICAL";
                }

                if (Set.of(
                                FailureCategory.K8S_DEPLOY,
                                FailureCategory.AUTH_CREDENTIALS,
                                FailureCategory.BUILD_TIMEOUT).contains(category)) {

                        return "HIGH";
                }

                if (category == FailureCategory.TEST_FLAKY
                                && flaky.score() > 0.6) {

                        return "LOW";
                }

                return confidence > 0.8
                                ? "MEDIUM"
                                : "LOW";
        }

        private String buildSignature(
                        LogParserService.ParsedLog parsed) {

                String base = parsed.getStage()
                                + "|"
                                + parsed.getRootCauseLine()
                                + "|"
                                + String.join(",", parsed.getFailingTests());

                return String.format("%08x", base.hashCode());
        }

        private String summariseStack(
                        List<String> stack) {

                return stack.stream()
                                .limit(8)
                                .collect(Collectors.joining("\n"));
        }

        private static Pattern r(String regex) {
                return Pattern.compile(
                                regex,
                                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        }

        private static PatternEntry entry(
                        Pattern p,
                        FailureCategory cat,
                        double weight) {

                return new PatternEntry(p, cat, weight);
        }

        // ─────────────────────────────────────────────────────────────────────
        // INNER TYPES
        // ─────────────────────────────────────────────────────────────────────

        private record PatternEntry(
                        Pattern pattern,
                        FailureCategory category,
                        double weight) {
        }

        public record ClassificationResult(
                        FailureCategory category,
                        double confidence,
                        List<String> matchedSignals,
                        boolean isConfident) {

                static ClassificationResult unknown(
                                double confidence) {

                        return new ClassificationResult(
                                        FailureCategory.UNKNOWN,
                                        confidence,
                                        List.of(),
                                        false);
                }
        }

        public record FlakinessScore(
                        double score,
                        int totalRuns,
                        int failedRuns) {
        }

        public record FailureStats(
                        Map<String, Long> distribution,
                        long total) {
        }
}