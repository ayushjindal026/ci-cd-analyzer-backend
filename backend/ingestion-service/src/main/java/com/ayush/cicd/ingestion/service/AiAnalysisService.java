package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.FailureCategory;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.service.FailureClassifierService.ClassificationResult;
import com.ayush.cicd.ingestion.service.FailureClassifierService.FailureStats;
import com.ayush.cicd.ingestion.service.LogParserService.ParsedLog;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalysisService {

        private final RestTemplate restTemplate;
        private final RunAnalysisRepository analysisRepo;
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

        @Async("aiTaskExecutor")
        @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2))
        public RunAnalysis analyse(
                        Long repositoryId,
                        Long runId,
                        String stage,
                        String rawLog,
                        FailureStats stats) {

                try {

                        // Parse logs
                        ParsedLog parsed = logParser.parse(rawLog, stage);

                        // Local classification
                        ClassificationResult localResult = classifier.classifyLog(parsed.getCondensedLog());

                        // Build temp record
                        FailureRecord record = buildTempRecord(
                                        repositoryId,
                                        runId,
                                        parsed,
                                        localResult);

                        // Similar failures
                        List<FailureRecord> similar = classifier.findSimilar(record, 3);

                        // Build prompt
                        String prompt = buildPrompt(
                                        parsed,
                                        record,
                                        localResult,
                                        similar,
                                        stats);

                        // AI analysis
                        AiResponse aiResponse = aiEnabled
                                        ? callAi(prompt, localResult)
                                        : fallback(parsed, record, localResult);

                        // Persist
                        RunAnalysis analysis = RunAnalysis.builder()

                                        .runId(runId)

                                        .repositoryId(repositoryId)

                                        .stage(stage)

                                        .severity(aiResponse.severity())

                                        .failureCategory(aiResponse.failureCategory())

                                        .summary(aiResponse.summary())

                                        .rootCause(aiResponse.rootCause())

                                        .diagnosis(aiResponse.diagnosis())

                                        .recommendation(aiResponse.recommendation())

                                        .remediationSteps(
                                                        String.join(
                                                                        "\n",
                                                                        aiResponse.remediationSteps()))

                                        .affectedComponent(aiResponse.affectedComponent())

                                        .estimatedFixTime(aiResponse.estimatedFixTime())

                                        .priority(aiResponse.priority())

                                        .similarFailuresCount(similar.size())

                                        .flakinessScore(record.getFlakinessScore())

                                        .isFlaky(record.getFlakinessScore() > 0.5)

                                        .failingTests(record.getFailingTests())

                                        .analysedAt(Instant.now())

                                        .modelUsed(
                                                        aiEnabled
                                                                        ? resolveModel()
                                                                        : "rule-based")

                                        .build();

                        return analysisRepo.save(analysis);

                } catch (Exception ex) {

                        log.error(
                                        "AI analysis failed for run {}: {}",
                                        runId,
                                        ex.getMessage(),
                                        ex);

                        return analysisRepo.save(
                                        RunAnalysis.builder()

                                                        .runId(runId)

                                                        .repositoryId(repositoryId)

                                                        .stage(stage)

                                                        .summary(
                                                                        "Analysis failed: "
                                                                                        + ex.getMessage())

                                                        .severity("MEDIUM")

                                                        .failureCategory(FailureCategory.UNKNOWN)

                                                        .analysedAt(Instant.now())

                                                        .modelUsed("error")

                                                        .build());
                }
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
                                        .forEach(t -> sb.append("- ")
                                                        .append(t)
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
                                        .forEach(line -> sb.append(line)
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
        // AI CALLS
        // ─────────────────────────────────────────────────────────────────────

        private AiResponse callAi(
                        String prompt,
                        ClassificationResult localResult) {

                return "groq".equalsIgnoreCase(provider)
                                ? callGroq(prompt, localResult)
                                : callOpenAi(prompt, localResult);
        }

        private AiResponse callOpenAi(
                        String prompt,
                        ClassificationResult localResult) {

                if (openaiKey.isBlank()) {

                        return fallback(
                                        null,
                                        null,
                                        localResult);
                }

                return doCall(
                                "https://api.openai.com/v1/chat/completions",
                                openaiModel,
                                openaiKey,
                                prompt,
                                localResult);
        }

        private AiResponse callGroq(
                        String prompt,
                        ClassificationResult localResult) {

                if (groqKey.isBlank()) {

                        return fallback(
                                        null,
                                        null,
                                        localResult);
                }

                return doCall(
                                "https://api.groq.com/openai/v1/chat/completions",
                                groqModel,
                                groqKey,
                                prompt,
                                localResult);
        }

        private AiResponse doCall(
                        String url,
                        String model,
                        String key,
                        String prompt,
                        ClassificationResult localResult) {

                HttpHeaders headers = new HttpHeaders();

                headers.setContentType(MediaType.APPLICATION_JSON);

                headers.setBearerAuth(key);

                Map<String, Object> body = Map.of(

                                "model", model,

                                "temperature", 0.1,

                                "max_tokens", 1000,

                                "messages", List.of(
                                                Map.of(
                                                                "role", "user",
                                                                "content", prompt)));

                try {

                        ResponseEntity<Map> response = restTemplate.exchange(
                                        url,
                                        HttpMethod.POST,
                                        new HttpEntity<>(body, headers),
                                        Map.class);

                        return parseResponse(
                                        response.getBody(),
                                        localResult);

                } catch (Exception ex) {

                        log.error(
                                        "AI call failed: {}",
                                        ex.getMessage());

                        return fallback(
                                        null,
                                        null,
                                        localResult);
                }
        }

        // ─────────────────────────────────────────────────────────────────────
        // RESPONSE PARSING
        // ─────────────────────────────────────────────────────────────────────

        @SuppressWarnings("unchecked")
        private AiResponse parseResponse(
                        Map<?, ?> body,
                        ClassificationResult localResult) {

                try {

                        List<?> choices = (List<?>) body.get("choices");

                        String content = (String) ((Map<?, ?>) ((Map<?, ?>) choices.get(0))
                                        .get("message"))
                                        .get("content");

                        content = content
                                        .replaceAll(
                                                        "```json\\s*|```\\s*",
                                                        "")
                                        .trim();

                        AiJsonResponse parsed = objectMapper.readValue(
                                        content,
                                        AiJsonResponse.class);

                        FailureCategory category = localResult.isConfident()
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

                                        parsed.confidenceScore());

                } catch (Exception ex) {

                        log.error(
                                        "Failed to parse AI response: {}",
                                        ex.getMessage());

                        return fallback(
                                        null,
                                        null,
                                        localResult);
                }
        }

        // ─────────────────────────────────────────────────────────────────────
        // FALLBACK
        // ─────────────────────────────────────────────────────────────────────

        private AiResponse fallback(
                        ParsedLog parsed,
                        FailureRecord record,
                        ClassificationResult localResult) {

                FailureCategory category = localResult != null
                                ? localResult.category()
                                : FailureCategory.UNKNOWN;

                return new AiResponse(

                                "Pipeline failure detected",

                                record != null
                                                ? Objects.toString(
                                                                record.getRootCauseLine(),
                                                                "Unknown root cause")
                                                : "AI unavailable",

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
                                                : 0.0);
        }

        // ─────────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────────

        private FailureCategory parseCategory(
                        String value) {

                try {

                        return value != null
                                        ? FailureCategory.valueOf(value)
                                        : FailureCategory.UNKNOWN;

                } catch (Exception ex) {

                        return FailureCategory.UNKNOWN;
                }
        }

        private String resolveModel() {

                return "groq".equalsIgnoreCase(provider)
                                ? groqModel
                                : openaiModel;
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

                        double confidenceScore) {
        }
}