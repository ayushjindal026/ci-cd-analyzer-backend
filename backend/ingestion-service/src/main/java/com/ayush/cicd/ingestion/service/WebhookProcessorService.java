package com.ayush.cicd.ingestion.service;

import com.ayush.cicd.ingestion.service.GitHubLogFetcherService;
import com.ayush.cicd.common.entity.MonitoredRepository;
import com.ayush.cicd.common.entity.PipelineRun;
import com.ayush.cicd.common.enums.BuildStatus;
import com.ayush.cicd.common.enums.PipelineSource;
import com.ayush.cicd.common.repository.MonitoredRepositoryRepository;
import com.ayush.cicd.common.repository.PipelineRunRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookProcessorService {

        private final PipelineRunRepository runRepo;

        private final MonitoredRepositoryRepository repoRepo;

        private final GitHubLogFetcherService logFetcher;

        private final ObjectMapper objectMapper = new ObjectMapper();

        @Value("${github.webhook.secret:}")
        private String webhookSecret;

        // =====================================================
        // Process Webhook
        // =====================================================

        @Async
        public void process(
                        String event,
                        String signature,
                        Map<String, Object> payload) {

                try {

                        // Verify webhook signature
                        if (!webhookSecret.isBlank()
                                        && !verifySignature(signature, payload)) {

                                log.warn(
                                                "Webhook signature mismatch for event: {}",
                                                event);

                                return;
                        }

                        switch (event) {

                                case "workflow_run" ->
                                        handleWorkflowRun(payload);

                                case "push" ->
                                        handlePush(payload);

                                default ->
                                        log.debug(
                                                        "Unhandled webhook event: {}",
                                                        event);
                        }

                } catch (Exception e) {

                        log.error(
                                        "Webhook processing error [{}]: {}",
                                        event,
                                        e.getMessage(),
                                        e);
                }
        }

        // =====================================================
        // workflow_run
        // =====================================================

        @SuppressWarnings("unchecked")
        private void handleWorkflowRun(
                        Map<String, Object> payload) {

                Map<String, Object> workflowRun = (Map<String, Object>) payload.get("workflow_run");

                Map<String, Object> githubRepo = (Map<String, Object>) payload.get("repository");

                if (workflowRun == null || githubRepo == null) {
                        return;
                }

                String action = (String) payload.get("action");

                Long githubRunId = toLong(workflowRun.get("id"));

                String status = normaliseStatus(
                                (String) workflowRun.get("conclusion"),
                                (String) workflowRun.get("status"));

                String branch = (String) workflowRun.get("head_branch");

                String fullName = (String) githubRepo.get("full_name");

                String commitSha = (String) workflowRun.get("head_sha");

                String workflowName = (String) workflowRun.get("name");

                String trigger = (String) workflowRun.get("event");

                log.info(
                                "workflow_run event: action={} status={} repo={}",
                                action,
                                status,
                                fullName);

                String[] parts = fullName.split("/");

                if (parts.length != 2) {

                        log.warn(
                                        "Invalid repository full name received: {}",
                                        fullName);

                        return;
                }

                String owner = parts[0];
                String repoName = parts[1];

                Optional<MonitoredRepository> repoOpt = repoRepo.findByOwnerAndRepoNameAndSource(
                                owner,
                                repoName,
                                PipelineSource.GITHUB_ACTIONS);

                if (repoOpt.isEmpty()) {

                        log.debug(
                                        "Received webhook for untracked repo: {}",
                                        fullName);

                        return;
                }

                MonitoredRepository repo = repoOpt.get();

                PipelineRun run = runRepo.findByRepository_IdAndExternalRunId(
                                repo.getId(),
                                String.valueOf(githubRunId))

                                .orElseGet(() -> PipelineRun.builder()

                                                .externalRunId(
                                                                String.valueOf(githubRunId))

                                                .repository(repo)

                                                .build());

                // Update fields
                run.setStatus(
                                toBuildStatus(status));

                run.setBranch(branch);

                run.setHeadSha(commitSha);

                run.setWorkflowName(workflowName);

                // Optional fields
                try {
                        run.setTriggeredBy(trigger);
                } catch (Exception ignored) {
                }

                // Started
                if ("requested".equalsIgnoreCase(action)
                                || "in_progress".equalsIgnoreCase(action)) {

                        if (run.getStartedAt() == null) {
                                run.setStartedAt(Instant.now());
                        }
                }

                // Completed
                if ("completed".equalsIgnoreCase(action)) {

                        run.setCompletedAt(Instant.now());

                        if (run.getStartedAt() != null) {

                                long durationMs = run.getCompletedAt().toEpochMilli()
                                                - run.getStartedAt().toEpochMilli();

                                run.setDurationMs(durationMs);
                        }
                }
                // Save run
                log.info(
                                "Saving pipeline run: repo={} externalRunId={} status={}",
                                repo.getFullName(),
                                githubRunId,
                                run.getStatus());

                // Save run
                PipelineRun savedRun = runRepo.save(run);

                log.info(
                                "Saved pipeline run: repo={} externalRunId={} status={}",
                                repo.getFullName(),
                                githubRunId,
                                savedRun.getStatus());

                // Trigger AI analysis
                if ("completed".equalsIgnoreCase(action)
                                && "failed".equalsIgnoreCase(status)) {

                        log.info(
                                        "Auto-triggering AI analysis for failed run {}",
                                        savedRun.getId());

                        logFetcher.fetchAndAnalyse(
                                        repo.getId(),
                                        savedRun.getId());
                }
        }

        // =====================================================
        // push
        // =====================================================

        @SuppressWarnings("unchecked")
        private void handlePush(
                        Map<String, Object> payload) {

                Map<String, Object> githubRepo = (Map<String, Object>) payload.get("repository");

                if (githubRepo == null) {
                        return;
                }

                String fullName = (String) githubRepo.get("full_name");

                String ref = (String) payload.get("ref");

                log.debug(
                                "Push event: repo={} ref={}",
                                fullName,
                                ref);
        }

        // =====================================================
        // Signature Verification
        // =====================================================

        private boolean verifySignature(
                        String signature,
                        Map<String, Object> payload) {

                if (webhookSecret == null || webhookSecret.isBlank()) {
                        log.warn("No webhook secret configured — skipping signature verification (unsafe in production)");
                        return true;
                }

                if (signature == null || !signature.startsWith("sha256=")) {
                        log.warn("Missing or malformed X-Hub-Signature-256 header");               
                        return false;
                }

                try {

                        String body = objectMapper.writeValueAsString(payload);

                        Mac mac = Mac.getInstance("HmacSHA256");

                        mac.init(
                                        new SecretKeySpec(
                                                        webhookSecret.getBytes(
                                                                        StandardCharsets.UTF_8),
                                                        "HmacSHA256"));

                        byte[] computed = mac.doFinal(
                                        body.getBytes(StandardCharsets.UTF_8));

                        String expected = "sha256="
                                        + HexFormat.of().formatHex(computed);

                        return expected.equals(signature);

                } catch (Exception e) {

                        log.error(
                                        "Signature verification error: {}",
                                        e.getMessage(),
                                        e);

                        return false;
                }
        }

        // =====================================================
        // Helpers
        // =====================================================

        private String normaliseStatus(
        String conclusion,
        String status) {

        if (conclusion != null) {

                return switch (conclusion.toLowerCase()) {

                case "success" ->
                        "success";

                case "failure" ->
                        "failed";

                case "cancelled" ->
                        "cancelled";

                case "timed_out" ->
                        "failed";

                default ->
                        conclusion.toLowerCase();
                };
        }

        if (status != null) {

                return switch (status.toLowerCase()) {

                case "queued" ->
                        "pending";

                case "in_progress" ->
                        "running";

                case "completed" ->
                        "success";

                default ->
                        status.toLowerCase();
                };
        }

        return "unknown";
        }

        private BuildStatus toBuildStatus(
                        String status) {

                return switch (status == null
                                ? ""
                                : status.toLowerCase()) {

                        case "success" ->
                                BuildStatus.SUCCESS;

                        case "failed" ->
                                BuildStatus.FAILED;

                        case "cancelled" ->
                                BuildStatus.CANCELLED;

                        case "running" ->
                                BuildStatus.RUNNING;

                        case "pending" ->
                                BuildStatus.QUEUED;

                        default ->
                                BuildStatus.UNKNOWN;
                };
        }

        private Long toLong(
                        Object value) {

                if (value == null) {
                        return null;
                }

                if (value instanceof Integer i) {
                        return i.longValue();
                }

                if (value instanceof Long l) {
                        return l;
                }

                if (value instanceof String s) {

                        try {
                                return Long.parseLong(s);
                        } catch (NumberFormatException e) {

                                log.warn(
                                                "Failed to parse Long from value: {}",
                                                s);

                                return null;
                        }
                }

                return null;
        }
}