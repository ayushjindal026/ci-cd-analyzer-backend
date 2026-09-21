package com.ayush.cicd.ingestion.client;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.ayush.cicd.common.enums.FailureCategory;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

/**
 * HTTP client that calls the Python FastAPI AI service at /analyze.
 *
 * WHY this exists separately from AiAnalysisService?
 * AiAnalysisService calls Groq directly from Java using AiProviderClient.
 * AiAnalysisClient calls the Python FastAPI service which ALSO calls Groq.
 * They are two separate paths to AI analysis.
 *
 * Python /analyze contract:
 *   Request:  { "prompt": "...", "max_tokens": 1000, "temperature": 0.1 }
 *   Response: { "content": "<raw JSON string from LLM>" }
 *
 * The raw JSON string inside "content" matches this schema:
 *   { summary, rootCause, diagnosis, recommendation, remediationSteps,
 *     failureCategory, severity, affectedComponent, estimatedFixTime,
 *     priority, similarPatterns, confidenceScore }
 */
@Component
@Slf4j
public class AiAnalysisClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AiAnalysisClient(
            @Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl,
            ObjectMapper objectMapper) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Sends a failed run to the Python AI service for analysis.
     * Returns null if the service is unavailable — never blocks the sync.
     *
     * WHY return null instead of throwing?
     * AI analysis is best-effort. If Python is down, the sync must
     * still complete. Runs get saved, analysis can be retried later.
     */
    public RunAnalysis analyse(PipelineRun run) {
        try {
            if (!isHealthy()) {
                log.warn("AI service unhealthy — skipping analysis for run {}", run.getId());
                return null;
            }

            log.info("STARTING AI ANALYSIS for run {}", run.getId());

            // Build a prompt string — Python expects { "prompt": "..." }
            String prompt = buildPrompt(run);
            AiAnalysisRequest request = new AiAnalysisRequest(prompt, 1000, 0.1);

            // Python returns { "content": "<raw json string>" }
            AiAnalysisResponse response = webClient.post()
                    .uri("/analyze")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiAnalysisResponse.class)
                    .block();

            log.info("AI RESPONSE received for run {}", run.getId());

            if (response == null || response.getContent() == null) {
                log.warn("AI service returned null content for run {}", run.getId());
                return null;
            }

            // Parse the JSON string inside "content"
            return parseContentToRunAnalysis(run, response.getContent());

        } catch (WebClientResponseException e) {
            log.error("AI HTTP ERROR {} for run {} — body: {}",
                    e.getStatusCode(), run.getId(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.error("AI analysis failed for run {}: {}", run.getId(), e.getMessage(), e);
            return null;
        }
    }

    // ── Health check ──────────────────────────────────────────────────────────

    private boolean isHealthy() {
        try {
            String response = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            log.info("AI HEALTH RESPONSE = {}", response);
            return true;
        } catch (Exception e) {
            log.error("AI HEALTH CHECK FAILED: {}", e.getMessage());
            return false;
        }
    }

    // ── Prompt builder ────────────────────────────────────────────────────────

    /**
     * Builds the prompt string sent to the Python /analyze endpoint.
     * Python passes this directly to the LLM with the system prompt.
     *
     * WHY build the prompt in Java?
     * The Python /analyze endpoint accepts a raw prompt string — it doesn't
     * know about PipelineRun structure. Java has the full run context, so
     * Java builds the prompt, Python executes it against the LLM.
     */
    private String buildPrompt(PipelineRun run) {
        return String.format("""
                Analyze this CI/CD pipeline failure and return ONLY raw JSON.

                Repository: %s/%s
                Workflow: %s
                Branch: %s
                Status: %s
                Commit SHA: %s
                Duration: %d ms
                GitHub Run ID: %s

                Based on the workflow name, branch, status, and duration,
                diagnose the most likely root cause of this pipeline failure.

                Return ONLY the JSON schema from your system prompt. No markdown. No explanation.
                """,
                run.getRepository().getOwner(),
                run.getRepository().getRepoName(),
                run.getWorkflowName() != null ? run.getWorkflowName() : "unknown",
                run.getBranch() != null ? run.getBranch() : "main",
                run.getStatus().name(),
                run.getHeadSha() != null ? run.getHeadSha() : "unknown",
                run.getDurationMs() != null ? run.getDurationMs() : 0L,
                run.getExternalRunId() != null ? run.getExternalRunId() : "unknown"
        );
    }

    // ── Response parsing ──────────────────────────────────────────────────────

    /**
     * Parses the JSON string inside Python's "content" field into a RunAnalysis.
     *
     * Python returns: { "content": "{\"rootCause\":\"...\", ...}" }
     * We parse the inner JSON string into AiJsonContent, then build RunAnalysis.
     */
    private RunAnalysis parseContentToRunAnalysis(PipelineRun run, String content) {
        try {
            // Strip any accidental markdown fences the LLM might add
            String cleaned = content.trim();
            if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
            else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
            if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);
            cleaned = cleaned.trim();

            AiJsonContent parsed = objectMapper.readValue(cleaned, AiJsonContent.class);

            FailureCategory category = parseCategory(parsed.getFailureCategory());

            double confidence = parsed.getConfidenceScore() != null
                    ? parsed.getConfidenceScore() : 0.0;

            String rootCause = parsed.getRootCause() != null
                    ? parsed.getRootCause()
                    : (parsed.getSummary() != null ? parsed.getSummary() : "Analysis unavailable");

            String recommendation = parsed.getRecommendation() != null
                    ? parsed.getRecommendation() : "Review pipeline logs";

            log.info("AI analysis parsed — run={} category={} confidence={}",
                    run.getId(), category, confidence);

            return RunAnalysis.builder()
                    .runId(run.getId())
                    .repositoryId(run.getRepository().getId())
                    .failureCategory(category)
                    .rootCause(rootCause)
                    .diagnosis(parsed.getDiagnosis())
                    .recommendation(recommendation)
                    .summary(parsed.getSummary())
                    .severity(parsed.getSeverity() != null ? parsed.getSeverity() : "MEDIUM")
                    .affectedComponent(parsed.getAffectedComponent())
                    .estimatedFixTime(parsed.getEstimatedFixTime())
                    .priority(parsed.getPriority())
                    .remediationSteps(
                            parsed.getRemediationSteps() != null
                                    ? String.join("\n", parsed.getRemediationSteps())
                                    : null)
                    .confidenceScore(confidence)
                    .classificationSource("AI_PYTHON")
                    .modelUsed("llama-3.1-8b-instant")
                    .analysedAt(java.time.Instant.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse AI content for run {}: {}", run.getId(), e.getMessage());
            log.debug("Raw content was: {}", content);
            return null;
        }
    }

    private FailureCategory parseCategory(String value) {
        if (value == null || value.isBlank()) return FailureCategory.UNKNOWN;
        try {
            return FailureCategory.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown failure category '{}' — defaulting to UNKNOWN", value);
            return FailureCategory.UNKNOWN;
        }
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────────

    /**
     * Request to Python /analyze endpoint.
     * Python expects exactly: { prompt, max_tokens, temperature }
     */
    @Data
    static class AiAnalysisRequest {
        @JsonProperty("prompt")
        private final String prompt;

        @JsonProperty("max_tokens")
        private final int maxTokens;

        @JsonProperty("temperature")
        private final double temperature;
    }

    /**
     * Response from Python /analyze endpoint.
     * Python returns: { "content": "<raw json string from LLM>" }
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiAnalysisResponse {
        @JsonProperty("content")
        private String content;
    }

    /**
     * The JSON schema inside the "content" string.
     * This is what the LLM returns, matching the system prompt schema in main.py.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiJsonContent {
        @JsonProperty("summary")
        private String summary;

        @JsonProperty("rootCause")
        private String rootCause;

        @JsonProperty("diagnosis")
        private String diagnosis;

        @JsonProperty("recommendation")
        private String recommendation;

        @JsonProperty("remediationSteps")
        private java.util.List<String> remediationSteps;

        @JsonProperty("failureCategory")
        private String failureCategory;

        @JsonProperty("severity")
        private String severity;

        @JsonProperty("affectedComponent")
        private String affectedComponent;

        @JsonProperty("estimatedFixTime")
        private String estimatedFixTime;

        @JsonProperty("priority")
        private String priority;

        @JsonProperty("similarPatterns")
        private java.util.List<String> similarPatterns;

        @JsonProperty("confidenceScore")
        private Double confidenceScore;
    }
}