package com.ayush.cicd.ingestion.client;

import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.entity.RunAnalysis;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * HTTP client that calls the Python FastAPI AI service.
 *
 * WHY a separate client class and not inline in the service?
 * The HTTP call, request building, and response mapping are
 * infrastructure concerns. The ingestion service should not
 * know about HTTP — it calls this client and gets a RunAnalysis back.
 * Separation makes both classes independently testable.
 */
@Component
@Slf4j
public class AiAnalysisClient {

    private final WebClient webClient;

    public AiAnalysisClient(
            @Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    /**
     * Sends a failed run to the AI service for analysis.
     * Returns null if the AI service is unavailable — never blocks the sync.
     *
     * WHY return null instead of throwing?
     * AI analysis is a best-effort feature. If the Python service is down,
     * the sync must still complete successfully. Runs get saved, lastSyncedAt
     * gets updated. Analysis can be retried later.
     */
    public RunAnalysis analyse(PipelineRun run) {
        try {
            // Health check before sending — fast fail if service is down
            boolean healthy = isHealthy();
            if (!healthy) {
                log.warn("AI service is not healthy, skipping analysis for run {}",
                        run.getId());
                return null;
            }

            AiAnalysisRequest request = buildRequest(run);

            AiAnalysisResponse response = webClient.post()
                    .uri("/analyze")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiAnalysisResponse.class)
                    .block();

            log.info("AI RESPONSE OBJECT = {}", response);

            if (response == null) {
                log.warn("AI service returned null for run {}", run.getId());
                return null;
            }

            return RunAnalysis.builder()
                    .pipelineRun(run)
                    .category(response.getCategory())
                    .rootCauseSummary(response.getRootCauseSummary())
                    .suggestedFix(response.getSuggestedFix())
                    .confidenceScore(response.getConfidenceScore())
                    .analysedByModel(response.getAnalysedByModel())
                    .logSnippet(response.getLogSnippet())
                    .build();

        } catch (WebClientResponseException e) {
            log.error("AI HTTP ERROR for run {}", run.getId(), e);
            return null;
        }

        catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }

    private boolean isHealthy() {
        try {
            webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private AiAnalysisRequest buildRequest(PipelineRun run) {
        return new AiAnalysisRequest(
                run.getId(),
                run.getExternalRunId(),
                run.getRepository().getOwner(),
                run.getRepository().getRepoName(),
                run.getWorkflowName(),
                run.getBranch() != null ? run.getBranch() : "main",
                run.getStatus().name(),
                run.getHeadSha(),
                run.getDurationMs() != null ? run.getDurationMs().intValue() : null);
    }

    // ── Inner DTOs — request/response for the Python AI service ──────────────

    @Data
    static class AiAnalysisRequest {
        @JsonProperty("run_id")
        private final Long runId;
        @JsonProperty("external_run_id")
        private final String externalRunId;
        @JsonProperty("owner")
        private final String owner;
        @JsonProperty("repo_name")
        private final String repoName;
        @JsonProperty("workflow_name")
        private final String workflowName;
        @JsonProperty("branch")
        private final String branch;
        @JsonProperty("status")
        private final String status;
        @JsonProperty("head_sha")
        private final String headSha;
        @JsonProperty("duration_ms")
        private final Integer durationMs;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiAnalysisResponse {

        @JsonProperty("run_id")
        private Long runId;

        private String category;

        @JsonProperty("root_cause_summary")
        private String rootCauseSummary;

        @JsonProperty("suggested_fix")
        private String suggestedFix;

        @JsonProperty("confidence_score")
        private Double confidenceScore;

        @JsonProperty("analysed_by_model")
        private String analysedByModel;

        @JsonProperty("log_snippet")
        private String logSnippet;
    }
}
