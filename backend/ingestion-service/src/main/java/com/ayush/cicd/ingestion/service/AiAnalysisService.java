package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.common.entity.FailureRecord;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.repository.RunAnalysisRepository;
import com.ayush.cicd.ingestion.service.FailureClassifierService.FailureStats;
import com.ayush.cicd.ingestion.service.LogParserService.ParsedLog;
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

    // ── Main entry point ──────────────────────────────────────────────────────

    @Async("aiTaskExecutor")
    @Retryable(maxAttempts = 2, backoff = @Backoff(delay = 2000))
    public RunAnalysis analyse(
            Long repoId, Long runId, String stage,
            String rawLog, FailureStats stats) {
        try {
            ParsedLog parsed = logParser.parse(rawLog, stage);
            FailureRecord record = buildTempRecord(repoId, runId, parsed);
            List<FailureRecord> similar = classifier.findSimilar(record, 3);

            String prompt = buildPrompt(parsed, record, similar, stats);
            AiResponse aiR = aiEnabled ? callAi(prompt) : fallback(parsed, record);

            RunAnalysis analysis = RunAnalysis.builder()
                    .runId(runId)
                    .repositoryId(repoId)
                    .stage(stage)
                    .severity(record.getSeverity())
                    .category(record.getCategory())
                    .summary(aiR.summary())
                    .rootCause(aiR.rootCause())
                    .diagnosis(aiR.diagnosis())
                    .recommendation(aiR.recommendation())
                    .remediationSteps(String.join("\n", aiR.remediationSteps()))
                    .affectedComponent(aiR.affectedComponent())
                    .estimatedFixTime(aiR.estimatedFixTime())
                    .priority(aiR.priority())
                    .similarFailuresCount(similar.size())
                    .flakinessScore(record.getFlakinessScore())
                    .isFlaky(record.getFlakinessScore() > 0.5)
                    .failingTests(record.getFailingTests())
                    .analysedAt(Instant.now())
                    .modelUsed(aiEnabled ? resolveModel() : "rule-based")
                    .build();

            return analysisRepo.save(analysis);

        } catch (Exception e) {
            log.error("AI analysis failed for run {}: {}", runId, e.getMessage(), e);
            return analysisRepo.save(RunAnalysis.builder()
                    .runId(runId).repositoryId(repoId).stage(stage)
                    .summary("Analysis failed: " + e.getMessage())
                    .severity("MEDIUM").analysedAt(Instant.now()).modelUsed("error")
                    .build());
        }
    }

    // ── Prompt ────────────────────────────────────────────────────────────────

    private String buildPrompt(ParsedLog parsed, FailureRecord record,
            List<FailureRecord> similar, FailureStats stats) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                You are PipelineIQ, an expert DevOps AI that analyses CI/CD pipeline failures.
                You have deep knowledge of Spring Boot, Maven, Docker, GitHub Actions, and Java testing.
                Analyze the failure below and respond with ONLY a JSON object. No markdown, no preamble.

                """);

        sb.append("Stage: ").append(parsed.getStage()).append("\n");
        sb.append("Category: ").append(record.getCategory()).append("\n");
        sb.append("Severity: ").append(record.getSeverity()).append("\n");
        sb.append("OOM: ").append(parsed.isOom())
                .append(" | Timeout: ").append(parsed.isTimeout()).append("\n");
        sb.append("Flakiness: ").append(String.format("%.2f", record.getFlakinessScore())).append("/1.0\n");

        if (!parsed.getFailingTests().isEmpty()) {
            sb.append("\nFailing tests:\n");
            parsed.getFailingTests().forEach(t -> sb.append("  - ").append(t).append("\n"));
        }
        if (parsed.getRootCauseLine() != null) {
            sb.append("\nRoot cause line:\n").append(parsed.getRootCauseLine()).append("\n");
        }
        if (!parsed.getStackTrace().isEmpty()) {
            sb.append("\nStack trace (top 15):\n");
            parsed.getStackTrace().stream().limit(15).forEach(l -> sb.append(l).append("\n"));
        }
        if (parsed.getCondensedLog() != null && !parsed.getCondensedLog().isBlank()) {
            sb.append("\nCondensed log:\n");
            sb.append(parsed.getCondensedLog(), 0, Math.min(2000, parsed.getCondensedLog().length()));
        }
        if (stats != null) {
            sb.append("\n\nHistorical context (").append(stats.windowDays()).append(" days):\n");
            sb.append("Total failures: ").append(stats.totalFailures()).append("\n");
            sb.append("By stage: ").append(stats.byStage()).append("\n");
            if (!stats.flakyTests().isEmpty())
                sb.append("Flaky tests: ").append(String.join(", ", stats.flakyTests())).append("\n");
            if (!stats.topRootCauses().isEmpty())
                sb.append("Top causes: ").append(String.join(" | ", stats.topRootCauses())).append("\n");
        }
        if (!similar.isEmpty()) {
            sb.append("\nSimilar past failures:\n");
            similar.forEach(s -> sb.append("  - [").append(s.getCategory()).append("] ")
                    .append(Objects.toString(s.getRootCauseLine(), "")).append("\n"));
        }

        sb.append("""

                Required JSON format:
                {
                  "summary": "one sentence — what went wrong",
                  "rootCause": "technical root cause 1-2 sentences",
                  "diagnosis": "detailed diagnosis 3-5 sentences",
                  "recommendation": "primary fix 1-2 sentences",
                  "remediationSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
                  "isFlaky": true/false,
                  "affectedComponent": "class or module if identifiable",
                  "estimatedFixTime": "15 minutes / 1 hour / 1 day",
                  "priority": "P1/P2/P3/P4"
                }
                """);
        return sb.toString();
    }

    // ── Provider calls ────────────────────────────────────────────────────────

    private AiResponse callAi(String prompt) {
        return "groq".equalsIgnoreCase(provider) ? callGroq(prompt) : callOpenAi(prompt);
    }

    private AiResponse callOpenAi(String prompt) {
        if (openaiKey.isBlank())
            return fallback(null, null);
        return doCall("https://api.openai.com/v1/chat/completions", openaiModel, openaiKey, prompt);
    }

    private AiResponse callGroq(String prompt) {
        if (groqKey.isBlank())
            return fallback(null, null);
        return doCall("https://api.groq.com/openai/v1/chat/completions", groqModel, groqKey, prompt);
    }

    private AiResponse doCall(String url, String model, String key, String prompt) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(key);

        Map<String, Object> body = Map.of(
                "model", model, "temperature", 0.2, "max_tokens", 800,
                "messages", List.of(Map.of("role", "user", "content", prompt)));

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, h), Map.class);
            return parseResponse(resp.getBody());
        } catch (Exception e) {
            log.error("AI call to {} failed: {}", url, e.getMessage());
            return fallback(null, null);
        }
    }

    @SuppressWarnings("unchecked")
    private AiResponse parseResponse(Map<?, ?> body) {
        try {
            List<?> choices = (List<?>) body.get("choices");
            String content = (String) ((Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message")).get("content");
            content = content.replaceAll("```json\\s*|```\\s*", "").trim();

            Map<String, Object> p = objectMapper.readValue(content, Map.class);
            List<String> steps = p.get("remediationSteps") instanceof List<?>
                    ? ((List<?>) p.get("remediationSteps")).stream().map(Object::toString).collect(Collectors.toList())
                    : List.of();

            return new AiResponse(str(p, "summary"), str(p, "rootCause"), str(p, "diagnosis"),
                    str(p, "recommendation"), steps, str(p, "affectedComponent"),
                    str(p, "estimatedFixTime"), str(p, "priority"));
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            return fallback(null, null);
        }
    }

    private AiResponse fallback(ParsedLog parsed, FailureRecord record) {
        return new AiResponse(
                "Pipeline failure" + (parsed != null ? " in " + parsed.getStage() : ""),
                record != null ? Objects.toString(record.getRootCauseLine(), "N/A") : "AI unavailable",
                "Rule-based analysis. Enable OpenAI or Groq for full AI diagnosis.",
                "Review error lines in the log. Re-run the pipeline after fixing the issue.",
                List.of("1. Review full run logs", "2. Check recent commits", "3. Re-run pipeline"),
                null, null, "P2");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String resolveModel() {
        return "groq".equalsIgnoreCase(provider) ? groqModel : openaiModel;
    }

    private static String str(Map<?, ?> m, String k) {
        Object v = m.get(k);
        return v != null ? v.toString() : null;
    }

    /** Lightweight record object used only for prompt building — not persisted. */
    private FailureRecord buildTempRecord(Long repoId, Long runId, ParsedLog parsed) {
        com.ayush.cicd.ingestion.service.FailureClassifierService.Severity sev = parsed.isOom() || parsed.isTimeout()
                ? com.ayush.cicd.ingestion.service.FailureClassifierService.Severity.CRITICAL
                : com.ayush.cicd.ingestion.service.FailureClassifierService.Severity.MEDIUM;
        return FailureRecord.builder()
                .runId(runId).repositoryId(repoId)
                .stage(parsed.getStage())
                .category(parsed.getCategory().name())
                .severity(sev.name())
                .rootCauseLine(parsed.getRootCauseLine())
                .failingTests(String.join("|", parsed.getFailingTests()))
                .flakinessScore(0.0)
                .signature(String.format("%08x", (parsed.getCategory().name() + parsed.getStage()).hashCode()))
                .build();
    }

    public record AiResponse(
            String summary, String rootCause, String diagnosis,
            String recommendation, List<String> remediationSteps,
            String affectedComponent, String estimatedFixTime, String priority) {
    }
}