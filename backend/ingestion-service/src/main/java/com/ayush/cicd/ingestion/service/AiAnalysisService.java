package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.FailureCategory;
import com.ayush.cicd.ingestion.client.AiProviderClient;
import com.ayush.cicd.ingestion.client.AiProviderClient.NonRetryableAiProviderException;
import com.ayush.cicd.ingestion.client.AiProviderClient.RetryableAiProviderException;
import com.ayush.cicd.ingestion.service.FailureClassifierService.ClassificationResult;
import com.ayush.cicd.ingestion.service.FailureClassifierService.FailureStats;
import com.ayush.cicd.ingestion.service.LogParserService.ParsedLog;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalysisService {

    private final AiProviderClient aiProviderClient;
    private final FailureClassifierService classifier;
    private final LogParserService logParser;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────────────
    // CONFIG
    // ─────────────────────────────────────────────────────────────────────

    @Value("${ai.provider:openai}")
    private String provider;

    @Value("${ai.openai.api-key:}")
    private String openaiKey;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openaiModel;

    @Value("${ai.groq.api-key:}")
    private String groqKey;

    @Value("${ai.groq.model:llama-3.1-70b-versatile}")
    private String groqModel;

    @Value("${ai.enabled:true}")
    private boolean aiEnabled;

    // ─────────────────────────────────────────────────────────────────────
    // MAIN ENTRY
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Performs AI analysis for one pipeline failure.
     *
     * This service does NOT:
     * - run asynchronously
     * - persist RunAnalysis
     * - update PipelineRun status
     *
     * Those responsibilities belong to PipelineAnalysisOrchestrator.
     */
    public RunAnalysis analyse(
            Long repositoryId,
            Long runId,
            String stage,
            String rawLog,
            FailureStats stats) {

        log.info(
                "Starting AI analysis — run={} repository={} stage={}",
                runId,
                repositoryId,
                stage);

        if (rawLog == null || rawLog.isBlank()) {
            throw new IllegalArgumentException(
                    "Cannot analyse an empty pipeline log");
        }

        // ─────────────────────────────────────────────────────────────────
        // PARSE LOG
        // ─────────────────────────────────────────────────────────────────

        ParsedLog parsed =
                logParser.parse(rawLog, stage);

        // ─────────────────────────────────────────────────────────────────
        // LOCAL CLASSIFICATION
        // ─────────────────────────────────────────────────────────────────

        ClassificationResult localResult =
                classifier.classifyLog(
                        parsed.getCondensedLog());

        // ─────────────────────────────────────────────────────────────────
        // BUILD TEMPORARY FAILURE RECORD
        // ─────────────────────────────────────────────────────────────────

        FailureRecord record =
                buildTempRecord(
                        repositoryId,
                        runId,
                        parsed,
                        localResult);

        // ─────────────────────────────────────────────────────────────────
        // FIND SIMILAR FAILURES
        // ─────────────────────────────────────────────────────────────────

        List<FailureRecord> similar =
                classifier.findSimilar(
                        record,
                        3);

        // ─────────────────────────────────────────────────────────────────
        // BUILD PROMPT
        // ─────────────────────────────────────────────────────────────────

        String prompt =
                buildPrompt(
                        parsed,
                        record,
                        localResult,
                        similar,
                        stats);

        // ─────────────────────────────────────────────────────────────────
        // AI / FALLBACK
        // ─────────────────────────────────────────────────────────────────

        AiResponse aiResponse;

        if (!aiEnabled) {

            log.info(
                    "AI disabled — using rule-based analysis for run={}",
                    runId);

            aiResponse =
                    fallback(
                            parsed,
                            record,
                            localResult);

        } else {

            aiResponse =
                    callAi(
                            prompt,
                            parsed,
                            record,
                            localResult);
        }

        // ─────────────────────────────────────────────────────────────────
        // BUILD RESULT
        // ─────────────────────────────────────────────────────────────────

        return RunAnalysis.builder()
                .runId(runId)
                .repositoryId(repositoryId)
                .stage(stage)

                .severity(
                        aiResponse.severity())

                .failureCategory(
                        aiResponse.failureCategory())

                .summary(
                        aiResponse.summary())

                .rootCause(
                        aiResponse.rootCause())

                .diagnosis(
                        aiResponse.diagnosis())

                .recommendation(
                        aiResponse.recommendation())

                .remediationSteps(
                        String.join(
                                "\n",
                                aiResponse.remediationSteps()))

                .affectedComponent(
                        aiResponse.affectedComponent())

                .estimatedFixTime(
                        aiResponse.estimatedFixTime())

                .priority(
                        aiResponse.priority())

                .similarFailuresCount(
                        similar.size())

                .flakinessScore(
                        record.getFlakinessScore())

                .isFlaky(
                        record.getFlakinessScore() > 0.5)

                .failingTests(
                        record.getFailingTests())

                .confidenceScore(
                        aiResponse.confidenceScore())

                .analysedAt(
                        Instant.now())

                .modelUsed(
                        aiResponse.modelUsed())

                .build();

}

    // ─────────────────────────────────────────────────────────────────────
    // PROMPT
    // ─────────────────────────────────────────────────────────────────────

    private String buildPrompt(
            ParsedLog parsed,
            FailureRecord record,
            ClassificationResult local,
            List<FailureRecord> similar,
            FailureStats stats) {

        StringBuilder sb = new StringBuilder();

        sb.append("""
                You are PipelineIQ, an elite CI/CD failure analysis AI.

                Analyze the pipeline failure below and return ONLY raw JSON.
                No markdown.
                No explanations.
                No code blocks.

                """);

        sb.append("Stage: ")
                .append(parsed.getStage())
                .append("\n");

        sb.append("Local Classification: ")
                .append(local.category().label())
                .append("\n");

        sb.append("Confidence: ")
                .append(String.format(
                        "%.0f%%",
                        local.confidence() * 100))
                .append("\n");

        sb.append("Severity: ")
                .append(record.getSeverity())
                .append("\n");

        sb.append("OOM: ")
                .append(parsed.isOom())
                .append("\n");

        sb.append("Timeout: ")
                .append(parsed.isTimeout())
                .append("\n");

        if (!parsed.getFailingTests().isEmpty()) {

            sb.append("\nFailing Tests:\n");

            parsed.getFailingTests()
                    .forEach(test ->
                            sb.append("- ")
                                    .append(test)
                                    .append("\n"));
        }

        if (parsed.getRootCauseLine() != null) {

            sb.append("\nRoot Cause:\n")
                    .append(parsed.getRootCauseLine())
                    .append("\n");
        }

        if (!parsed.getStackTrace().isEmpty()) {

            sb.append("\nStack Trace:\n");

            parsed.getStackTrace()
                    .stream()
                    .limit(15)
                    .forEach(line ->
                            sb.append(line)
                                    .append("\n"));
        }

        if (parsed.getCondensedLog() != null) {

            sb.append("\nCondensed Log:\n");

            sb.append(
                    parsed.getCondensedLog(),
                    0,
                    Math.min(
                            3000,
                            parsed.getCondensedLog().length()));
        }

        if (!similar.isEmpty()) {

            sb.append("\nSimilar Failures:\n");

            similar.forEach(s ->
                    sb.append("- [")
                            .append(s.getCategory())
                            .append("] ")
                            .append(
                                    Objects.toString(
                                            s.getRootCauseLine(),
                                            ""))
                            .append("\n"));
        }

        if (stats != null) {

            sb.append("\nHistorical Failure Statistics:\n")
                    .append(stats)
                    .append("\n");
        }

        sb.append("""

                Return EXACT JSON schema:

                {
                  "summary": "brief summary",
                  "rootCause": "technical cause",
                  "diagnosis": "detailed diagnosis",
                  "recommendation": "main fix",
                  "remediationSteps": ["step1", "step2"],
                  "failureCategory": "ENUM",
                  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
                  "affectedComponent": "service/file/module",
                  "estimatedFixTime": "15 mins",
                  "priority": "P1/P2/P3/P4",
                  "similarPatterns": ["x","y"],
                  "confidenceScore": 0.0
                }
                """);

        return sb.toString();
    }

    // ─────────────────────────────────────────────────────────────────────
    // AI CALL
    // ─────────────────────────────────────────────────────────────────────

    private AiResponse callAi(
            String prompt,
            ParsedLog parsed,
            FailureRecord record,
            ClassificationResult localResult) {

        String normalizedProvider =
                provider == null
                        ? ""
                        : provider.trim().toLowerCase();

        String apiKey;
        String model;
        String url;

        switch (normalizedProvider) {

            case "groq" -> {
                apiKey = groqKey;
                model = groqModel;
                url =
                        "https://api.groq.com/openai/v1/chat/completions";
            }

            case "openai" -> {
                apiKey = openaiKey;
                model = openaiModel;
                url =
                        "https://api.openai.com/v1/chat/completions";
            }

            default -> {

                log.error(
                        "Unsupported AI provider configured: {}",
                        provider);

                return fallback(
                        parsed,
                        record,
                        localResult);
            }
        }

        if (apiKey == null || apiKey.isBlank()) {

            log.warn(
                    "AI provider={} has no API key configured — " +
                    "using rule-based fallback",
                    normalizedProvider);

            return fallback(
                    parsed,
                    record,
                    localResult);
        }

        try {

            Map<?, ?> response =
                    aiProviderClient.call(
                            normalizedProvider,
                            url,
                            model,
                            apiKey,
                            prompt);

            AiResponse result =
                    parseResponse(
                            response,
                            localResult,
                            model);

            log.info(
                    "AI analysis generated — run stage={} provider={} model={}",
                    parsed.getStage(),
                    normalizedProvider,
                    result.modelUsed());

            return result;

        } catch (RetryableAiProviderException ex) {

            /*
             * AiProviderClient has already exhausted its retry attempts.
             * At this point the analysis can safely fall back.
             */
            log.warn(
                    "AI provider unavailable after retries — " +
                    "using rule-based fallback. provider={} reason={}",
                    normalizedProvider,
                    ex.getMessage());

            return fallback(
                    parsed,
                    record,
                    localResult);

        } catch (NonRetryableAiProviderException ex) {

            /*
             * Invalid credentials/request/model etc. should not be retried.
             * We still preserve the product's best-effort behavior by using
             * the deterministic rule-based analysis.
             */
            log.warn(
                    "AI provider rejected request — " +
                    "using rule-based fallback. provider={} reason={}",
                    normalizedProvider,
                    ex.getMessage());

            return fallback(
                    parsed,
                    record,
                    localResult);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RESPONSE PARSING
    // ─────────────────────────────────────────────────────────────────────

    private AiResponse parseResponse(
            Map<?, ?> body,
            ClassificationResult localResult,
            String model) {

        try {

            if (body == null) {
                throw new IllegalStateException(
                        "AI provider returned an empty response");
            }

            Object choicesObject =
                    body.get("choices");

            if (!(choicesObject instanceof List<?> choices)
                    || choices.isEmpty()) {

                throw new IllegalStateException(
                        "AI provider response contains no choices");
            }

            Object firstChoice =
                    choices.get(0);

            if (!(firstChoice instanceof Map<?, ?> choice)) {

                throw new IllegalStateException(
                        "Invalid AI choice structure");
            }

            Object messageObject =
                    choice.get("message");

            if (!(messageObject instanceof Map<?, ?> message)) {

                throw new IllegalStateException(
                        "Invalid AI message structure");
            }

            Object contentObject =
                    message.get("content");

            if (!(contentObject instanceof String content)
                    || content.isBlank()) {

                throw new IllegalStateException(
                        "AI response contains empty content");
            }

            content = cleanJsonContent(content);

            AiJsonResponse parsed =
                    objectMapper.readValue(
                            content,
                            AiJsonResponse.class);

            FailureCategory category =
                    localResult.isConfident()
                            ? localResult.category()
                            : parseCategory(
                                    parsed.failureCategory());

            return new AiResponse(
                    parsed.summary(),
                    parsed.rootCause(),
                    parsed.diagnosis(),
                    parsed.recommendation(),
                    parsed.remediationSteps() != null
                            ? parsed.remediationSteps()
                            : List.of(),
                    category,
                    parsed.severity() != null
                            ? parsed.severity()
                            : "MEDIUM",
                    parsed.affectedComponent(),
                    parsed.estimatedFixTime(),
                    parsed.priority(),
                    parsed.similarPatterns() != null
                            ? parsed.similarPatterns()
                            : List.of(),
                    parsed.confidenceScore(),
                    model);

        } catch (Exception ex) {

            /*
             * A malformed AI response is recoverable.
             * We do not mark the entire pipeline analysis FAILED.
             */
            log.warn(
                    "Invalid AI response — using rule-based fallback: {}",
                    ex.getMessage());

            return fallback(
                    null,
                    null,
                    localResult);
        }
    }

    private String cleanJsonContent(
            String content) {

        String cleaned =
                content.trim();

        if (cleaned.startsWith("```json")) {
            cleaned =
                    cleaned.substring(
                            "```json".length());
        } else if (cleaned.startsWith("```")) {
            cleaned =
                    cleaned.substring(
                            "```".length());
        }

        if (cleaned.endsWith("```")) {
            cleaned =
                    cleaned.substring(
                            0,
                            cleaned.length() - 3);
        }

        return cleaned.trim();
    }

    // ─────────────────────────────────────────────────────────────────────
    // FALLBACK
    // ─────────────────────────────────────────────────────────────────────

    private AiResponse fallback(
            ParsedLog parsed,
            FailureRecord record,
            ClassificationResult localResult) {

        FailureCategory category =
                localResult != null
                        ? localResult.category()
                        : FailureCategory.UNKNOWN;

        String rootCause;

        if (record != null) {

            rootCause =
                    Objects.toString(
                            record.getRootCauseLine(),
                            "Unknown root cause");

        } else if (parsed != null
                && parsed.getRootCauseLine() != null) {

            rootCause =
                    parsed.getRootCauseLine();

        } else {

            rootCause =
                    "AI unavailable";
        }

        return new AiResponse(
                "Pipeline failure detected",
                rootCause,
                "Rule-based analysis fallback used.",
                "Review pipeline logs and retry after fixes.",
                List.of(
                        "Review failing stage logs",
                        "Check recent commits",
                        "Retry pipeline"),
                category,
                "MEDIUM",
                null,
                "30 minutes",
                "P2",
                List.of(),
                localResult != null
                        ? localResult.confidence()
                        : 0.0,
                "rule-based");
    }

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private FailureCategory parseCategory(
            String value) {

        try {

            return value != null
                    ? FailureCategory.valueOf(
                            value.trim().toUpperCase())
                    : FailureCategory.UNKNOWN;

        } catch (Exception ex) {

            return FailureCategory.UNKNOWN;
        }
    }

    private FailureRecord buildTempRecord(
            Long repositoryId,
            Long runId,
            ParsedLog parsed,
            ClassificationResult local) {

        return FailureRecord.builder()
                .runId(runId)
                .repositoryId(repositoryId)
                .stage(parsed.getStage())
                .category(local.category().name())
                .severity(
                        parsed.isOom()
                                ? "CRITICAL"
                                : "MEDIUM")
                .rootCauseLine(
                        parsed.getRootCauseLine())
                .failingTests(
                        String.join(
                                "|",
                                parsed.getFailingTests()))
                .flakinessScore(0.0)
                .signature(
                        String.format(
                                "%08x",
                                (local.category().name()
                                        + parsed.getStage())
                                        .hashCode()))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────
    // TYPES
    // ─────────────────────────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiJsonResponse(
            String summary,
            String rootCause,
            String diagnosis,
            String recommendation,
            List<String> remediationSteps,
            String failureCategory,
            String severity,
            String affectedComponent,
            String estimatedFixTime,
            String priority,
            List<String> similarPatterns,
            double confidenceScore) {
    }

    public record AiResponse(
            String summary,
            String rootCause,
            String diagnosis,
            String recommendation,
            List<String> remediationSteps,
            FailureCategory failureCategory,
            String severity,
            String affectedComponent,
            String estimatedFixTime,
            String priority,
            List<String> similarPatterns,
            double confidenceScore,
            String modelUsed) {
    }
}